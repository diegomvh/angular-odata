import buildQuery, { alias, Alias } from './builder';
import { PlainObject } from './builder';
//import buildQuery from 'odata-query';

import { isoStringToDate, Types } from '../utils/index';
import { parseQuery } from '../types';

export enum QueryOptionNames {
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
  custom = 'custom'
}

export class ODataQueryOptions {
  options?: PlainObject;

  constructor(options?: PlainObject) {
    this.options = options || {};
  }

  // Params
  params(): PlainObject {
    let options = [
      QueryOptionNames.select,
      QueryOptionNames.filter,
      QueryOptionNames.search,
      QueryOptionNames.transform,
      QueryOptionNames.orderBy,
      QueryOptionNames.top,
      QueryOptionNames.skip,
      QueryOptionNames.skiptoken,
      QueryOptionNames.expand,
      QueryOptionNames.format]
        .filter(key => !Types.isEmpty(this.options[key]))
        .reduce((acc, key) => Object.assign(acc, {[key]: this.options[key]}), {});

    let query = buildQuery(options);
    let params = (query) ? parseQuery(query.substr(1)) : {};

    // Custom
    let custom = this.options[QueryOptionNames.custom] || {};
    Object.assign(params, custom);

    return params;
  }

  toJSON() {
    return isoStringToDate(JSON.parse(JSON.stringify(this.options)));
  }

  clone() {
    return new ODataQueryOptions(this.toJSON());
  }

  // Option Handler
  option<T>(type: QueryOptionNames, opts?: T) {
    if (!Types.isUndefined(opts))
      this.options[type] = opts;
    return new OptionHandler<T>(this.options, type);
  }

  // Query Options tools
  has(type: QueryOptionNames) {
    return !Types.isUndefined(this.options[type]);
  }

  remove(...types: QueryOptionNames[]) {
    types.forEach(type => this.option(type).clear());
  }

  keep(...types: QueryOptionNames[]) {
    this.options = Object.keys(this.options)
      .filter((k: QueryOptionNames) => types.indexOf(k) !== -1)
      .reduce((acc, k) => Object.assign(acc, { [k]: this.options[k] }), {});
  }

  // Aliases
  alias(name: string, value: any): Alias {
    return alias(name, value);
  }

  // Clear
  clear() {
    this.options = {};
  }
}

export class OptionHandler<T> {
  constructor(private o: PlainObject, private t: QueryOptionNames) { }

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