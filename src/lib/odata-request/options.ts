import buildQuery from 'odata-query';

import { Utils } from '../utils/utils';

import { PlainObject, OptionHandler, Options } from './types';

export class ODataOptions {
  options?: PlainObject

  constructor( options?: PlainObject) {
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
      .filter(key => !Utils.isEmpty(this.options[key]))
      .map(key => buildQuery({ [key]: this.options[key] }))
      .reduce((acc, param: string) => {
        let index = param.indexOf("=");
        let name = param.substr(1, index - 1);
        let values = param.substr(index + 1);
        return Object.assign(acc, {[name]: values});
      }, {});
    return Object.assign(odata, this.options[Options.custom] || {});
  }

  toJSON() {
    return Object.assign({}, this.options);
  }

  clone() {
    return new ODataOptions(this.toJSON());
  }

  //Handlers
  protected wrapObject<T>(type: string, opts?: T | T[]) {
    if (Utils.isUndefined(this.options[type]))
      this.options[type] = {};
    if (!Utils.isUndefined(opts))
      this.options[type] = opts;
    return new OptionHandler<T>(this.options, type);
  }

  protected wrapValue<T>(type: string, opts?: T) {
    if (Utils.isUndefined(opts))
      return this.options[type];
    this.options[type] = opts;
  }

  // Options
  option<T>(type: string, opts?: T | T[]) {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<T>(type, opts);
  }

  value<T>(type: string, opts?: T) {
    return this.wrapValue<T>(type, opts);
  }

  has(type) {
    return !Utils.isUndefined(this.options[type]);
  }

  remove(type) {
    delete this.options[type];
  }

 /* 
  select(opts?: string | string[]) {
    return this.wrapObject<string>(Options.select, typeof (opts) === 'string' ? [opts] : opts);
  }
  hasSelect() {
    return this.hasOption(Options.select);
  }
  removeSelect() {
    this.removeOption(Options.select);
  }

  search(opts?: string) {
    return this.wrapValue<string>(Options.search, opts);
  }
  hasSearch() {
    return this.hasOption(Options.search);
  }
  removeSearch() {
    this.removeOption(Options.search);
  }

  filter(opts?: Filter): OptionHandler<Filter> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<Filter>(Options.filter, opts);
  }
  removeFilter() {
    this.removeOption(Options.filter);
  }

  groupBy(opts?: GroupBy) {
    return this.wrapObject(Options.groupBy, opts);
  }
  removeGroupBy() {
    this.removeOption(Options.groupBy);
  }

  transform(opts?: Transform) {
    return this.wrapObject(Options.transform, opts);
  }
  removeTransform() {
    this.removeOption(Options.transform);
  }

  orderBy(opts?: string | string[]) {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<string>(Options.orderBy, opts);
  }
  removeOrderBy() { 
    this.removeOption(Options.orderBy); 
  }

  expand(opts?: Expand): OptionHandler<Expand> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<Expand>(Options.expand, opts);
  }
  hasExpand() {
    return this.hasOption(Options.expand);
  }
  removeExpand() {
    this.removeOption(Options.expand);
  }

  format(opts?: string) {
    return this.wrapValue<string>(Options.format, opts);
  }
  removeFormat() {
    this.removeOption(Options.format);
  }

  top(opts?: number) {
    return this.wrapValue<number>(Options.top, opts);
  }
  removeTop() {
    this.removeOption(Options.top);
  }

  skip(opts?: number) {
    return this.wrapValue<number>(Options.skip, opts);
  }
  removeSkip() {
    this.removeOption(Options.skip);
  }
  
  count(opts?: boolean) {
    return this.wrapValue<boolean>(Options.count, opts);
  }
  removeCount() {
    this.removeOption(Options.count);
  }

  custom(opts?: PlainObject) {
    return this.wrapObject(Options.custom, opts);
  }
  removeCustom() {
    this.removeOption(Options.custom);
  }
*/
}