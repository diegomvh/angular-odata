import { QueryOptionNames } from '../../types';
import { Objects, Types } from '../../utils';
import {
  buildPathAndQuery,
  Expand,
  Filter,
  OrderBy,
  QueryCustomType,
  Select,
  Transform,
} from './builder';
import { Expression } from './expressions';
import { ODataQueryOptionHandler } from './handlers';

export type ODataQueryArguments<T> = {
  [QueryOptionNames.select]?: Select<T>;
  [QueryOptionNames.filter]?: Filter<T>;
  [QueryOptionNames.search]?: string;
  [QueryOptionNames.compute]?: string;
  [QueryOptionNames.transform]?: Transform<T>;
  [QueryOptionNames.orderBy]?: OrderBy<T>;
  [QueryOptionNames.top]?: number;
  [QueryOptionNames.skip]?: number;
  [QueryOptionNames.skiptoken]?: string;
  [QueryOptionNames.expand]?: Expand<T>;
  [QueryOptionNames.format]?: string;
};

export class ODataQueryOptions<T> {
  options: { [name: string]: any };

  constructor(options?: { [name: string]: any }) {
    this.options = options || {};
  }

  // Params
  pathAndParams(escape: boolean = false): [string, { [name: string]: any }] {
    let aliases: QueryCustomType[] = [];
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
      .reduce((acc, key) => {
        let value = this.options[key];
        if (Types.rawType(value) === 'Expression') {
          value = value.render(aliases);
        }
        return Object.assign(acc, { [key]: value });
      }, {});

    return buildPathAndQuery<any>({ ...options, aliases, escape });
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
    return Object.keys(this.options).reduce((acc, key) => {
      let value = this.options[key];
      if (Types.rawType(value) === 'Expression') {
        value = value.toJSON();
      }
      return Object.assign(acc, { [key]: value });
    }, {});
  }

  toQueryArguments(): ODataQueryArguments<T> {
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

  clone<O>() {
    const options = Object.keys(this.options).reduce((acc, key) => {
      let value = this.options[key];
      if (Types.rawType(value) !== 'Expression') {
        value = Objects.clone(value);
      }
      return Object.assign(acc, { [key]: value });
    }, {});
    return new ODataQueryOptions<O>(options);
  }

  // Set Renderable
  expression(name: QueryOptionNames, exp: Expression<T>) {
    return (this.options[name] = exp);
  }

  // Option Handler
  option<O>(name: QueryOptionNames, opts?: O) {
    if (opts !== undefined) this.options[name] = opts;
    return new ODataQueryOptionHandler<O>(this.options, name);
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
