import buildQuery from 'odata-query';

import { Types } from '../utils/types';

import { PlainObject, EntityKey } from '../types';

export type Select = string | string[];
export type OrderBy = string | string[];
export type NestedFilterOptions<T> = { 
  [P in keyof T]?: PlainObject;
};
export type Filter<T> = string | NestedFilterOptions<T> | Array<string | NestedFilterOptions<T>>;
export type NestedExpandOptions<T> = { 
  [P in keyof T]?: Partial<ExpandQueryOptions<T[P]>>;
};
export type Expand<T> = string | NestedExpandOptions<T> | Array<string | NestedExpandOptions<T>>;
export enum StandardAggregateMethods {
  sum = "sum",
  min = "min",
  max = "max",
  average = "average",
  countdistinct = "countdistinct",
}
export type Aggregate = { [propertyName: string]: { with: StandardAggregateMethods, as: string } } | string;

export interface ExpandQueryOptions<T> {
  select: string | string[];
  filter: Filter<T>;
  orderBy: string | string[];
  top: number;
  expand: Expand<T>;
}
export interface Transform {
  aggregate?: Aggregate | Aggregate[];
  filter?: Filter<any>;
  groupBy?: GroupBy;
}
export interface GroupBy {
  properties: string[];
  transform?: Transform;
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
    let odata = [
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
      .map(key => buildQuery({ [key]: this.options[key] }))
      .reduce((acc, param: string) => {
        let index = param.indexOf(ODataOptions.VALUE_SEPARATOR);
        let name = param.substr(1, index - 1);
        let values = param.substr(index + 1);
        return Object.assign(acc, {[name]: values});
      }, {});
    // TODO: Add query builder Skiptoken support
    if (Options.skiptoken in this.options)
      odata['$skiptoken'] = this.options[Options.skiptoken];
    return Object.assign(odata, this.options[Options.custom] || {});
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
      this.o[this.t] = [this.o[this.t]];
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
    else if (!Types.isUndefined(this.o[this.t]) && !Array.isArray(this.o[this.t])) {
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
    if (!Array.isArray(this.o[this.t])) {
      return this.o[this.t][name];
    }
  }

  unset(name: string) {
    delete this.assertObject()[name];
    if (Array.isArray(this.o[this.t])) {
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