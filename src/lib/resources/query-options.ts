import buildQuery from 'odata-query';

import { Types } from '../utils/types';

import { PlainObject } from '../types';
import { isoStringToDate } from '../utils/dates';

export type Select<T> = string | keyof T | Array<keyof T>;
export type OrderBy<T> = string | keyof T | [ keyof T, 'asc' | 'desc' ] | Array<keyof T | [ keyof T, 'asc' | 'desc' ]>;
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
  groupBy = 'groupBy',
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

export type QueryOptions<T> = {
  [QueryOptionTypes.select]?: Select<T>;
  [QueryOptionTypes.filter]?: Filter; 
  [QueryOptionTypes.search]?: string;
  [QueryOptionTypes.groupBy]?: GroupBy<T>;
  [QueryOptionTypes.transform]?: Transform<T>;
  [QueryOptionTypes.orderBy]?: OrderBy<T>;
  [QueryOptionTypes.top]?: number;
  [QueryOptionTypes.skip]?: number;
  [QueryOptionTypes.skiptoken]?: string;
  [QueryOptionTypes.expand]?: Expand<T>;
  [QueryOptionTypes.format]?: string;
  [QueryOptionTypes.custom]?: PlainObject;
  [QueryOptionTypes.aliases]?: PlainObject;
}

const orderByFieldMapper = (value: any) => 
  (Types.isArray(value) && value.length === 2 && ['asc', 'desc'].indexOf(value[1]) !== -1)? value.join(" ") : value;

const expandOptionsMapper = (options: any) => {
  return [
    QueryOptionTypes.select,
    QueryOptionTypes.filter,
    QueryOptionTypes.orderBy,
    QueryOptionTypes.top,
    QueryOptionTypes.expand]
    .filter(key => !Types.isEmpty(options[key]))
    .map(key => {
      let value = options[key];
      if (QueryOptionTypes.orderBy === key && Types.isArray(value)) {
        value = value.map(orderByFieldMapper);
      }
      if (QueryOptionTypes.expand === key && Types.isObject(value) && !Types.isArray(value)) {
        value = Object.entries(value).reduce((acc, [k, v]) => Object.assign(acc, {[k]: expandOptionsMapper(v)}), {});
      }
      return [key, value];
    })
    .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {});
}

const queryOptionsBuilder = (key, value): string => {
  switch (key) {
    case QueryOptionTypes.orderBy:
      if (Types.isArray(value)) {
        value = value.map(orderByFieldMapper);
      }
      break;
    case QueryOptionTypes.expand:
      if (Types.isObject(value))
        value = Object.entries(value).reduce((acc, [k, v]) => Object.assign(acc, {[k]: expandOptionsMapper(v)}), {});
      break;
  }
  return buildQuery({ [key]: value });
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
      QueryOptionTypes.groupBy,
      QueryOptionTypes.transform,
      QueryOptionTypes.orderBy,
      QueryOptionTypes.top,
      QueryOptionTypes.skip,
      QueryOptionTypes.expand,
      QueryOptionTypes.format]
      .filter(key => !Types.isEmpty(this.options[key]))
      .map(key => queryOptionsBuilder(key, this.options[key]))
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
    let aliases = this.options[QueryOptionTypes.aliases] || {};
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

  // Primitive value
  value() {
    return this.o[this.t];
  }

  // Array
  push(value: T) {
    if (!Types.isArray(this.o[this.t]))
      this.o[this.t] = this.o[this.t] !== undefined ? [this.o[this.t]] : [];
    this.o[this.t].push(value);
  }

  remove(value: T) {
    if (Types.isArray(this.o[this.t])) {
      this.o[this.t] = this.o[this.t].filter(v => v !== value);
      if (this.o[this.t].length === 1)
        this.o[this.t] = this.o[this.t][0];
    }
  }

  at(index: number) {
    if (Types.isArray(this.o[this.t])) {
      return this.o[this.t][index];
    }
  }

  // Hash map
  private assertObject(): PlainObject {
    if (Types.isObject(this.o[this.t]) && !Types.isArray(this.o[this.t]))
      return this.o[this.t];
    else if (!Types.isUndefined(this.o[this.t]) && !Types.isArray(this.o[this.t])) {
      this.o[this.t] = [this.o[this.t]];
      let obj = this.o[this.t].find(v => Types.isObject(v));
      if (!obj) {
        obj = {};
        this.o[this.t].push(obj);
      }
      return obj;
    }
    return (this.o[this.t] = {});
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