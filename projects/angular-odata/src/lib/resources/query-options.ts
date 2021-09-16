import {
  buildPathAndQuery,
  Expand,
  Filter,
  OrderBy,
  Select,
  Transform,
} from './builder';

import { Dates, Types, Urls, Objects } from '../utils';
import { QueryOptionNames } from '../types';

export type QueryArguments<T> = {
  select?: Select<T>;
  expand?: Expand<T>;
  transform?: Transform<T>;
  search?: string;
  filter?: Filter;
  orderBy?: OrderBy<T>;
  top?: number;
  skip?: number;
  skiptoken?: string;
};

export class ODataQueryOptions {
  options: { [name: string]: any };

  constructor(options?: { [name: string]: any }) {
    this.options = options || {};
  }

  // Params
  pathAndParams(): [string, { [name: string]: any }] {
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
      QueryOptionNames.format,
    ]
      .filter((key) => !Types.isEmpty(this.options[key]))
      .reduce(
        (acc, key) => Object.assign(acc, { [key]: this.options[key] }),
        {}
      );

    return buildPathAndQuery(options);
  }

  toString(): string {
    const [path, params] = this.pathAndParams();
    return (
      path +
      Object.entries(params)
        .filter(([, value]) => !Types.isEmpty(value))
        .map(([key, value]) => `${key}=${value}`)
        .join('&')
    );
  }

  toJSON() {
    return Dates.isoStringToDate(JSON.parse(JSON.stringify(this.options)));
  }

  toQueryArguments<T>(): QueryArguments<T> {
    return {
      select: this.options[QueryOptionNames.select],
      expand: this.options[QueryOptionNames.expand],
      transform: this.options[QueryOptionNames.transform],
      search: this.options[QueryOptionNames.search],
      filter: this.options[QueryOptionNames.filter],
      orderBy: this.options[QueryOptionNames.orderBy],
      top: this.options[QueryOptionNames.top],
      skip: this.options[QueryOptionNames.skip],
      skiptoken: this.options[QueryOptionNames.skiptoken],
    } as QueryArguments<T>;
  }

  clone() {
    return new ODataQueryOptions(this.toJSON());
  }

  // Option Handler
  option<T>(name: QueryOptionNames, opts?: T) {
    if (opts !== undefined) this.options[name] = opts;
    return new OptionHandler<T>(this.options, name);
  }

  // Query Options tools
  has(name: QueryOptionNames) {
    return this.options[name] !== undefined;
  }

  remove(...names: QueryOptionNames[]) {
    names.forEach((name) => this.option(name).clear());
  }

  keep(...names: QueryOptionNames[]) {
    this.options = Object.keys(this.options)
      .filter((k) => names.indexOf(k as QueryOptionNames) !== -1)
      .reduce((acc, k) => Object.assign(acc, { [k]: this.options[k] }), {});
  }

  // Clear
  clear() {
    this.options = {};
  }
}

export class OptionHandler<T> {
  constructor(
    private o: { [name: string]: any },
    private n: QueryOptionNames
  ) {}

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
    return (v !== undefined && (this.o[this.n] = v)) || this.o[this.n];
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
    this.o[this.n] = this.assertArray().filter((v) => v !== value);
    // If only one... down to value
    if (this.o[this.n].length === 1) this.o[this.n] = this.o[this.n][0];
  }

  at(index: number) {
    return this.assertArray()[index];
  }
  //#endregion

  //#region HashMap Value
  private assertObject(create: boolean): { [name: string]: any } {
    if (!Types.isArray(this.o[this.n]) && Types.isPlainObject(this.o[this.n])) {
      return this.o[this.n];
    }
    let arr = this.assertArray();
    let obj = arr.find((v) => Types.isPlainObject(v));
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
      if (this.o[this.n].length === 1) this.o[this.n] = this.o[this.n][0];
    }
  }

  has(path: string) {
    let obj = this.assertObject(false) || {};
    return Objects.has(obj, path);
  }

  assign(values: { [attr: string]: any }) {
    let obj = this.assertObject(true);
    return Objects.merge(obj, values);
  }
  //#endregion

  clear() {
    delete this.o[this.n];
  }
}
