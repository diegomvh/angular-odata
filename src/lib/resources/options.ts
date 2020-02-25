import buildQuery from 'odata-query';

import { Types } from '../utils/types';

import { PlainObject } from '../types';

export type Select<T> = string | keyof T | Array<keyof T>;
export type OrderBy<T> = string | keyof T | [ keyof T, 'asc' | 'desc' ] | Array<keyof T | [ keyof T, 'asc' | 'desc' ]>;
export type Filter = string | PlainObject | Array<string | PlainObject>;
export type Expand<T> = string | {[P in keyof T]?: ExpandOptions<any> } | Array<keyof T>;
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
  expand?: Expand<any>;
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

export enum Options {
  key = 'key',
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
  parameters = 'parameters',
  custom = 'custom'
}

const orderByFieldMapper = (value: any) => (Types.isArray(value) && value.length === 2 && ['asc', 'desc'].indexOf(value[1]) !== -1)? value.join(" ") : value;
const expandOptionsMapper = (value: any) => {
  return [
    Options.select,
    Options.filter,
    Options.orderBy,
    Options.top,
    Options.expand]
    .filter(key => !Types.isEmpty(value[key]))
    .map(key => {
      if (Options.orderBy === key && Types.isArray(value[key])) {
        return [key, value[key].map(orderByFieldMapper)];
      }
      if (Options.expand === key && Types.isObject(value[key])) {
        return [key, Object.entries(value[key]).reduce((acc, [k, v]) => Object.assign(acc, {[k]: expandOptionsMapper(v)}), {})];
      }
      return [key, value[key]];
    })
    .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {});
}

const queryOptionsBuilder = (key, value): string => {
  switch (key) {
    case Options.orderBy:
      if (Types.isArray(value)) {
        value = value.map(orderByFieldMapper);
      }
      break;
    case Options.expand:
      if (Types.isObject(value))
        value = Object.entries(value).reduce((acc, [k, v]) => Object.assign(acc, {[k]: expandOptionsMapper(v)}), {});
      break;
  }
  return buildQuery({ [key]: value });
}
export class ODataOptions {
  // URL QUERY PARTS
  public static readonly PARAM_SEPARATOR = '&';
  public static readonly VALUE_SEPARATOR = '=';

  options?: PlainObject

  constructor(options?: PlainObject) {
    this.options = options || {};
  }

  // Params
  params(): PlainObject {
    let params = [
      Options.select,
      Options.filter,
      Options.search,
      Options.groupBy,
      Options.transform,
      Options.orderBy,
      Options.top,
      Options.skip,
      Options.expand,
      Options.format]
      .filter(key => !Types.isEmpty(this.options[key]))
      .map(key => queryOptionsBuilder(key, this.options[key]))
      .reduce((acc, param: string) => {
        let index = param.indexOf(ODataOptions.VALUE_SEPARATOR);
        let name = param.substr(1, index - 1);
        let values = param.substr(index + 1);
        return Object.assign(acc, {[name]: values});
      }, {});
    // TODO: Add query builder Skiptoken support
    if (Options.skiptoken in this.options)
      params['$skiptoken'] = this.options[Options.skiptoken];
    return Object.assign(params, this.options[Options.custom] || {});
  }

  toJSON() {
    return Object.assign({}, this.options);
  }

  clone() {
    return new ODataOptions(this.toJSON());
  }

  // Option Handler
  option<T>(type: Options, opts?: T) {
    if (!Types.isUndefined(opts))
      this.options[type] = opts;
    return new OptionHandler<T>(this.options, type);
  }

  has(type: Options) {
    return !Types.isUndefined(this.options[type]);
  }

  remove(...types: Options[]) {
    types.forEach(type => this.option(type).clear());
  }

  keep(...types: Options[]) {
    this.options = Object.keys(this.options)
      .filter((k: Options) => types.indexOf(k) !== -1)
      .reduce((acc, k) => Object.assign(acc, { [k]: this.options[k] }), {});
  }

  clear() {
    this.options = {};
  }
}

export class OptionHandler<T> {
  constructor(private o: PlainObject, private t: Options) { }

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