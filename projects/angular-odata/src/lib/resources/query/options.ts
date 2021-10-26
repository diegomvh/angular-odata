import { Objects, Types } from '../../utils';
import {
  Expand,
  Filter,
  OrderBy,
  Select,
  Transform,
  buildPathAndQuery,
} from './builder';

import { QueryOptionNames } from '../../types';
import { OptionHandler } from './handlers';

export type ODataQueryArguments<T> = {
  select?: Select<T>;
  expand?: Expand<T>;
  transform?: Transform<T>;
  search?: string;
  compute?: string;
  filter?: Filter<T>;
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
      QueryOptionNames.compute,
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
    return this.option;
  }

  toQueryArguments<T>(): ODataQueryArguments<T> {
    return {
      select: this.options[QueryOptionNames.select],
      expand: this.options[QueryOptionNames.expand],
      transform: this.options[QueryOptionNames.transform],
      compute: this.options[QueryOptionNames.compute],
      search: this.options[QueryOptionNames.search],
      filter: this.options[QueryOptionNames.filter],
      orderBy: this.options[QueryOptionNames.orderBy],
      top: this.options[QueryOptionNames.top],
      skip: this.options[QueryOptionNames.skip],
      skiptoken: this.options[QueryOptionNames.skiptoken],
    } as ODataQueryArguments<T>;
  }

  clone() {
    return new ODataQueryOptions(Objects.clone(this.option));
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
