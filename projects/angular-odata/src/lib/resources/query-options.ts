import buildQuery, { alias, Alias } from './builder';

import { Dates, Types, Urls, Objects } from '../utils';

export enum QueryOptionNames {
  // System options
  select = 'select',
  expand = 'expand',
  filter = 'filter',
  search = 'search',
  transform = 'transform',
  orderBy = 'orderBy',
  top = 'top',
  skip = 'skip',
  skiptoken = 'skiptoken',
  format = 'format'
}

export class ODataQueryOptions {
  options: {[name: string]: any};

  constructor(options?: {[name: string]: any}) {
    this.options = options || {};
  }

  // Params
  params(): {[name: string]: any} {
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
    if (opts !== undefined)
      this.options[name] = opts;
    return new OptionHandler<T>(this.options, name);
  }

  // Query Options tools
  has(name: QueryOptionNames) {
    return this.options[name] !== undefined;
  }

  remove(...names: QueryOptionNames[]) {
    names.forEach(name => this.option(name).clear());
  }

  keep(...names: QueryOptionNames[]) {
    this.options = Object.keys(this.options)
      .filter(k => names.indexOf(k as QueryOptionNames) !== -1)
      .reduce((acc, k) => Object.assign(acc, { [k]: this.options[k] }), {});
  }


  // Clear
  clear() {
    this.options = {};
  }
}

export class OptionHandler<T> {
  constructor(private o: {[name: string]: any}, private n: QueryOptionNames) { }

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
    return v !== undefined && (this.o[this.n] = v) || this.o[this.n];
  }
  //#endregion

  //#region Array Value
  private assertArray(): any[] {
    if (!Types.isArray(this.o[this.n]))
      this.o[this.n] = this.o[this.n] !== undefined ? [this.o[this.n]] : [];
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
  private assertObject(create: boolean): {[name: string]: any} {
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
    Objects.set(obj, path, value);
  }

  get(path: string, def?: any): any {
    let obj = this.assertObject(false) || {};
    return Objects.get(obj, path, def);
  }

  unset(path: string) {
    let obj = this.assertObject(true);
    Objects.unset(obj, path);

    if (Types.isArray(this.o[this.n])) {
      this.o[this.n] = this.o[this.n].filter((v: any) => !Types.isEmpty(v));
      if (this.o[this.n].length === 1)
        this.o[this.n] = this.o[this.n][0];
    }
  }

  has(path: string) {
    let obj = this.assertObject(false) || {};
    return Objects.has(obj, path);
  }

  assign(values: {[attr: string]: any}) {
    let obj = this.assertObject(true);
    return Objects.merge(obj, values);
  }
  //#endregion

  clear() {
    delete this.o[this.n];
  }
}
