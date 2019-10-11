import buildQuery from 'odata-query';

import { Types } from '../utils/types';

import { PlainObject, OptionHandler, Options } from './types';

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