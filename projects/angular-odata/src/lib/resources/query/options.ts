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
  values: Map<QueryOptionNames, any>;

  constructor(values?: Map<QueryOptionNames, any> | { [name: string]: any }) {
    this.values =
      values instanceof Map
        ? values
        : new Map(
            Object.entries(values || {}) as Array<[QueryOptionNames, any]>
          );
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
      .filter((key) => !Types.isEmpty(this.values.get(key)))
      .reduce((acc, key) => {
        let value = this.values.get(key);
        if (Types.rawType(value).endsWith('Expression')) {
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
    return [...this.values.keys()].reduce((acc, key) => {
      let value = this.values.get(key);
      value =
        Types.isObject(value) && 'toJSON' in value ? value.toJSON() : value;
      return Object.assign(acc, { [key]: value });
    }, {});
  }

  toQueryArguments(): ODataQueryArguments<T> {
    return {
      select: this.values.get(QueryOptionNames.select),
      expand: this.values.get(QueryOptionNames.expand),
      transform: this.values.get(QueryOptionNames.transform),
      compute: this.values.get(QueryOptionNames.compute),
      search: this.values.get(QueryOptionNames.search),
      filter: this.values.get(QueryOptionNames.filter),
      orderBy: this.values.get(QueryOptionNames.orderBy),
      top: this.values.get(QueryOptionNames.top),
      skip: this.values.get(QueryOptionNames.skip),
      skiptoken: this.values.get(QueryOptionNames.skiptoken),
    } as ODataQueryArguments<T>;
  }

  clone<O>() {
    return new ODataQueryOptions<O>(Objects.clone(this.values));
  }

  // Set Renderable
  expression(key: QueryOptionNames, exp?: Expression<T>) {
    if (exp !== undefined) this.values.set(key, exp);
    return this.values.get(key);
  }

  // Option Handler
  option<O>(key: QueryOptionNames, opts?: O) {
    if (opts !== undefined) this.values.set(key, opts);
    return new ODataQueryOptionHandler<O>(this.values, key);
  }

  // Query Options tools
  has(key: QueryOptionNames) {
    return this.values.has(key);
  }

  remove(...keys: QueryOptionNames[]) {
    [...this.values.keys()]
      .filter((k) => keys.indexOf(k) !== -1)
      .forEach((key) => {
        this.values.delete(key);
      });
  }

  keep(...keys: QueryOptionNames[]) {
    [...this.values.keys()]
      .filter((k) => keys.indexOf(k) === -1)
      .forEach((key) => {
        this.values.delete(key);
      });
  }

  // Clear
  clear() {
    this.values.clear();
  }
}
