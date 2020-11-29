import buildQuery, { alias, Alias } from './builder';
import { PlainObject } from './builder';

import { Dates, Types, Urls } from '../utils';
import { Type } from '@angular/core';

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
    let params = (query) ? Urls.parseQueryString(query.substr(1)) : {};

    // Custom
    let custom = this.options[QueryOptionNames.custom] || {};
    if (Types.isArray(custom)) {
      //TODO: split test for item type
      custom = custom.reduce((acc, item) => Object.assign(acc, item), {});
    }
    Object.assign(params, custom);

    return params;
  }

  toString(): string {
    return Object.entries(this.params())
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  }

  toJSON() {
    return Dates.isoStringToDate(JSON.parse(JSON.stringify(this.options)));
  }

  clone() {
    return new ODataQueryOptions(this.toJSON());
  }

  // Option Handler
  option<T>(name: QueryOptionNames, opts?: T) {
    if (!Types.isUndefined(opts))
      this.options[name] = opts;
    return new OptionHandler<T>(this.options, name);
  }

  // Query Options tools
  has(name: QueryOptionNames) {
    return !Types.isUndefined(this.options[name]);
  }

  remove(...names: QueryOptionNames[]) {
    names.forEach(name => this.option(name).clear());
  }

  keep(...names: QueryOptionNames[]) {
    this.options = Object.keys(this.options)
      .filter((k: QueryOptionNames) => names.indexOf(k) !== -1)
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
  constructor(private o: PlainObject, private n: QueryOptionNames) { }

  get name() {
    return this.n;
  }

  toJSON() {
    return this.o[this.n];
  }

  empty() {
    return Types.isEmpty(this.o[this.n]);
  }

  //#region Primitive Value
  value(v?: any) {
    return !Types.isUndefined(v) && (this.o[this.n] = v) || this.o[this.n];
  }
  //#endregion

  //#region Array Value
  private assertArray(): Array<any> {
    if (!Types.isArray(this.o[this.n]))
      this.o[this.n] = !Types.isUndefined(this.o[this.n]) ? [this.o[this.n]] : [];
    return this.o[this.n];
  }

  push(value: T) {
    this.assertArray().push(value);
  }

  remove(value: T) {
    this.o[this.n] = this.assertArray().filter(v => v !== value);
    // If only one... down to value
    if (this.o[this.n].length === 1)
      this.o[this.n] = this.o[this.n][0];
  }

  at(index: number) {
    return this.assertArray()[index];
  }
  //#endregion

  //#region HashMap Value
  private assertObject(create: boolean): PlainObject {
    if (!Types.isArray(this.o[this.n]) && Types.isObject(this.o[this.n])) {
      return this.o[this.n];
    }
    let arr = this.assertArray();
    let obj = arr.find(v => Types.isObject(v));
    if (!obj && create) {
      obj = {};
      arr.push(obj);
    }
    return obj;
  }

  set(path: string, value: any) {
    let obj = this.assertObject(true);
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (Types.isArray(path) ? path : path.match(/([^[.\]])+/g)) as any[];

    pathArray.reduce((acc, key, i) => {
      if (acc[key] === undefined) acc[key] = {};
      if (i === pathArray.length - 1) acc[key] = value;
      return acc[key];
    }, obj);
  }

  get(path: string, def?: any): any {
    let obj = this.assertObject(false) || {};
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (Types.isArray(path) ? path : path.match(/([^[.\]])+/g)) as any[];
    // Find value if exist return otherwise return undefined value;
    return (pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj) || def);
  }

  unset(path: string) {
    let obj = this.assertObject(true);
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (Types.isArray(path) ? path : path.match(/([^[.\]])+/g)) as any[];

    pathArray.reduce((acc, key, i) => {
      if (i === pathArray.length - 1) delete acc[key];
      return acc[key];
    }, obj);

    if (Types.isArray(this.o[this.n])) {
      this.o[this.n] = this.o[this.n].filter(v => !Types.isEmpty(v));
      if (this.o[this.n].length === 1)
        this.o[this.n] = this.o[this.n][0];
    }
  }

  has(path: string) {
    let obj = this.assertObject(false) || {};
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (Types.isArray(path) ? path : path.match(/([^[.\]])+/g)) as any[];

    return !!pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj);
  }

  assign(values: PlainObject) {
    let obj = this.assertObject(true);
    Object.assign(obj, values);
  }
  //#endregion

  clear() {
    delete this.o[this.n];
  }
}
