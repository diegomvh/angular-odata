import buildQuery from 'odata-query';

import { PlainObject } from '../types';
import { isoStringToDate, Types, escapeIllegalChars } from '../utils/index';

export type Select<T> = string | keyof T | Array<keyof T>;
export type OrderBy<T> = string | OrderByOptions<T> | Array<OrderByOptions<T>> | { [P in keyof T]?: OrderBy<T[P]> };
export type Filter = string | PlainObject | Array<string | PlainObject>;
export type Expand<T> = string | Array<keyof T> | {[P in keyof T]?: (T[P] extends Array<infer E> ? ExpandOptions<E> : ExpandOptions<T[P]>) };
export enum StandardAggregateMethods {
  sum = "sum",
  min = "min",
  max = "max",
  average = "average",
  countdistinct = "countdistinct",
}
export type Aggregate = string | { [propertyName: string]: { with: StandardAggregateMethods, as: string } };

export type OrderByOptions<T> = keyof T | [ keyof T, 'asc' | 'desc' ];
export type ExpandOptions<T> = {
  select?: Select<T>;
  filter?: Filter;
  orderBy?: OrderBy<T>;
  top?: number;
  expand?: Expand<T>;
}

export type Transform<T> = {
  aggregate?: Aggregate | Array<Aggregate>;
  filter?: Filter;
  groupBy?: GroupBy<T>;
}
export type GroupBy<T> = {
  properties: Array<keyof T>;
  transform?: Transform<T>;
}

export enum QueryOptionTypes {
  // System options
  select = 'select',
  filter = 'filter',
  search = 'search',
  transform = 'transform',
  orderBy = 'orderBy',
  top = 'top',
  skip = 'skip',
  skiptoken = 'skiptoken',
  expand = 'expand',
  format = 'format',
  // Custom options
  custom = 'custom',
  // Parameter aliases
  aliases = 'aliases'
}

const orderByFieldMapper = (value: any) => 
  (Types.isArray(value) && value.length === 2 && ['asc', 'desc'].indexOf(value[1]) !== -1)? value.join(' ') : value;

const orderByOptionsMapper = (value: any, prefix: string = '') => {
  if (Types.isArray(value)) {
    return value.map(orderByFieldMapper).map(v => `${prefix}${v}`);
  } else if (Types.isObject(value)) {
    return Object.entries(value).map(([k, v]) => orderByOptionsMapper(v, `${k}/`)).map(v => `${prefix}${v}`);
  }
  return `${prefix}${value}`;
}

const expandOptionsMapper = (options: any) => {
  return [
    QueryOptionTypes.select,
    QueryOptionTypes.filter,
    QueryOptionTypes.orderBy,
    QueryOptionTypes.top,
    QueryOptionTypes.expand]
    .filter(key => !Types.isEmpty(options[key]))
    .map(key => queryOptionsMapper(key, options[key]))
    .reduce((acc, query) => Object.assign(acc, query), {});
}

const queryOptionsMapper = (key: string, value: any): {[key: string] : any} => {
  switch (key) {
    case QueryOptionTypes.orderBy:
      value = orderByOptionsMapper(value)
      break;
    case QueryOptionTypes.expand:
      if (Types.isObject(value) && !Types.isArray(value))
        value = Object.entries(value).reduce((acc, [k, v]) => Object.assign(acc, {[k]: expandOptionsMapper(v)}), {});
      break;
  }
  return { [key]: value };
}

const handleAliasValue = (value: any) => {
  if (typeof value === 'string') {
    return `'${escapeIllegalChars(value)}'`;
  } else if (value instanceof Date) {
    return value.toISOString();
  } else if (value instanceof Number) {
    return value;
  } else if (Array.isArray(value)) {
    // Double quote strings to keep them after `.join`
    const arr = value.map(d => (typeof d === 'string' ? `'${d}'` : d));
    return `[${arr.join(',')}]`;
  } else {
    switch (value && value.type) {
      case 'guid':
        return value.value;
      case 'raw':
        return value.value;
      case 'binary':
        return `binary'${value.value}'`;
    }
    return value;
  }
}

export class ODataQueryOptions {
  // URL QUERY PARTS
  public static readonly PARAM_SEPARATOR = '&';
  public static readonly VALUE_SEPARATOR = '=';

  options?: PlainObject;

  constructor(options?: PlainObject) {
    this.options = options || {};
  }

  // Params
  params(): PlainObject {
    let params = [
      QueryOptionTypes.select,
      QueryOptionTypes.filter,
      QueryOptionTypes.search,
      QueryOptionTypes.transform,
      QueryOptionTypes.orderBy,
      QueryOptionTypes.top,
      QueryOptionTypes.skip,
      QueryOptionTypes.expand,
      QueryOptionTypes.format]
      .filter(key => !Types.isEmpty(this.options[key]))
      .map(key => queryOptionsMapper(key, this.options[key]))
      .map(query => buildQuery(query))
      .reduce((acc, param: string) => {
        let index = param.indexOf(ODataQueryOptions.VALUE_SEPARATOR);
        let name = param.substr(1, index - 1);
        let values = param.substr(index + 1);
        return Object.assign(acc, {[name]: values});
      }, {});

    // TODO: Add query builder Skiptoken support
    if (QueryOptionTypes.skiptoken in this.options)
      params['$skiptoken'] = this.options[QueryOptionTypes.skiptoken];

    // Custom
    let custom = this.options[QueryOptionTypes.custom] || {};
    Object.assign(params, custom);

    // Aliases
    let aliases = Object.entries(this.options[QueryOptionTypes.aliases] || {})
      .reduce((acc, [k, v]) => Object.assign(acc, {[`@${k}`]: handleAliasValue(v)}), {});
    Object.assign(params, aliases);

    return params;
  }

  toJSON() {
    return isoStringToDate(JSON.parse(JSON.stringify(this.options)));
  }

  clone() {
    return new ODataQueryOptions(this.toJSON());
  }

  // Option Handler
  option<T>(type: QueryOptionTypes, opts?: T) {
    if (!Types.isUndefined(opts))
      this.options[type] = opts;
    return new OptionHandler<T>(this.options, type);
  }

  // Query Options tools
  has(type: QueryOptionTypes) {
    return !Types.isUndefined(this.options[type]);
  }

  remove(...types: QueryOptionTypes[]) {
    types.forEach(type => this.option(type).clear());
  }

  keep(...types: QueryOptionTypes[]) {
    this.options = Object.keys(this.options)
      .filter((k: QueryOptionTypes) => types.indexOf(k) !== -1)
      .reduce((acc, k) => Object.assign(acc, { [k]: this.options[k] }), {});
  }

  // Aliases
  alias(name: string, value?: any): any {
    var aliases = this.options[QueryOptionTypes.aliases] || (this.options[QueryOptionTypes.aliases] = {});
    if (Types.isUndefined(value))
      return aliases[name];
    return (aliases[name] = value);
  }

  // Clear
  clear() {
    this.options = {};
  }
}

export class OptionHandler<T> {
  constructor(private o: PlainObject, private t: QueryOptionTypes) { }

  get name() {
    return this.t;
  }

  toJSON() {
    return this.o[this.t];
  }

  // Add alias
  alias(name: string) {
    var aliases = this.o[QueryOptionTypes.aliases] || (this.o[QueryOptionTypes.aliases] = {});
    aliases[name] = null;
    return {type: 'raw', value: `@${name}`};
  }

  // Primitive value
  value() {
    return this.o[this.t];
  }

  // Array
  private assertArray(): Array<any> {
    if (!Types.isArray(this.o[this.t]))
      this.o[this.t] = !Types.isUndefined(this.o[this.t]) ? [this.o[this.t]] : [];
    return this.o[this.t];
  }

  push(value: T) {
    this.assertArray().push(value);
  }

  remove(value: T) {
    this.o[this.t] = this.assertArray().filter(v => v !== value);
    // If only one... down to value
    if (this.o[this.t].length === 1)
      this.o[this.t] = this.o[this.t][0];
  }

  at(index: number) {
    return this.assertArray()[index];
  }

  // Hash map
  private assertObject(): PlainObject {
    if (!Types.isArray(this.o[this.t]) && Types.isObject(this.o[this.t])) {
      return this.o[this.t];
    }
    let arr = this.assertArray();
    let obj = arr.find(v => Types.isObject(v));
    if (!obj) {
      obj = {};
      arr.push(obj);
    }
    return obj;
  }

  set(name: string, value: T) {
    this.assertObject()[name] = value;
  }

  get(name: string): T {
    if (!Types.isArray(this.o[this.t])) {
      return this.o[this.t][name];
    }
  }

  unset(name: string) {
    delete this.assertObject()[name];
    if (Types.isArray(this.o[this.t])) {
      this.o[this.t] = this.o[this.t].filter(v => !Types.isEmpty(v));
      if (this.o[this.t].length === 1)
        this.o[this.t] = this.o[this.t][0];
    }
  }

  has(name: string) {
    return !!this.get(name);
  }

  assign(values: PlainObject) {
    Object.assign(this.assertObject(), values);
  }

  clear() {
    delete this.o[this.t];
  }
}