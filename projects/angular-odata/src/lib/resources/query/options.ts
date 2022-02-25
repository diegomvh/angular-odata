import { QueryOptionNames } from '../../types';
import { Types } from '../../utils';
import {
  buildPathAndQuery,
  Expand,
  Filter,
  OrderBy,
  QueryCustomType,
  Select,
  Transform,
} from './builder';
import {
  Expression,
  FilterExpression,
  OrderByExpression,
  SearchExpression,
} from './expressions';
import { ExpandExpression } from './expressions/expand';
import { SelectExpression } from './expressions/select';
import { ODataQueryOptionHandler } from './handlers';

export type ODataQueryArguments<T> = {
  [QueryOptionNames.select]?: Select<T> | SelectExpression<T>;
  [QueryOptionNames.filter]?: Filter<T> | FilterExpression<T>;
  [QueryOptionNames.search]?: string | SearchExpression<T>;
  [QueryOptionNames.compute]?: string;
  [QueryOptionNames.transform]?: Transform<T>;
  [QueryOptionNames.orderBy]?: OrderBy<T> | OrderByExpression<T>;
  [QueryOptionNames.top]?: number;
  [QueryOptionNames.skip]?: number;
  [QueryOptionNames.skiptoken]?: string;
  [QueryOptionNames.expand]?: Expand<T> | ExpandExpression<T>;
  [QueryOptionNames.format]?: string;
};

export class ODataQueryOptions<T> {
  values: { [name: string]: any };

  constructor(options?: { [name: string]: any }) {
    this.values = options || {};
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
      .filter((key) => !Types.isEmpty(this.values[key]))
      .reduce((acc, key) => {
        let value = this.values[key];
        if (Types.rawType(value) === 'Expression') {
          value = (value as Expression<T>).render({ aliases });
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
    return Object.keys(this.values).reduce((acc, key) => {
      let value = this.values[key];
      if (Types.rawType(value) === 'Expression') {
        value = value.toJSON();
      }
      return Object.assign(acc, { [key]: value });
    }, {});
  }

  toQueryArguments(): ODataQueryArguments<T> {
    return {
      select: this.values[QueryOptionNames.select],
      expand: this.values[QueryOptionNames.expand],
      transform: this.values[QueryOptionNames.transform],
      compute: this.values[QueryOptionNames.compute],
      search: this.values[QueryOptionNames.search],
      filter: this.values[QueryOptionNames.filter],
      orderBy: this.values[QueryOptionNames.orderBy],
      top: this.values[QueryOptionNames.top],
      skip: this.values[QueryOptionNames.skip],
      skiptoken: this.values[QueryOptionNames.skiptoken],
    } as ODataQueryArguments<T>;
  }

  clone<O>() {
    const options = Object.keys(this.values).reduce((acc, key) => {
      let value = this.values[key];
      if (Types.rawType(value) !== 'Expression') {
        value = value.clone();
      }
      return Object.assign(acc, { [key]: value });
    }, {});
    return new ODataQueryOptions<O>(options);
  }

  // Set Renderable
  expression(name: QueryOptionNames, exp?: Expression<T>) {
    if (exp !== undefined) this.values[name] = exp;
    return this.values[name];
  }

  // Option Handler
  option<O>(name: QueryOptionNames, opts?: O) {
    if (opts !== undefined) this.values[name] = opts;
    return new ODataQueryOptionHandler<O>(this.values, name);
  }

  // Query Options tools
  has(name: QueryOptionNames) {
    return this.values[name] !== undefined;
  }

  remove(...names: QueryOptionNames[]) {
    names.forEach((name) => {
      delete this.values[name];
    });
  }

  keep(...names: QueryOptionNames[]) {
    this.values = Object.keys(this.values)
      .filter((k) => names.indexOf(k as QueryOptionNames) !== -1)
      .reduce((acc, k) => Object.assign(acc, { [k]: this.values[k] }), {});
  }

  // Clear
  clear() {
    this.values = {};
  }
}
