import { QueryOption } from '../../types';
import { Objects, Types } from '../../utils';
import {
  buildPathAndQuery,
  Expand,
  Filter,
  OrderBy,
  QueryCustomType,
  raw,
  Select,
  Transform,
} from './builder';
import {
  ComputeExpression,
  Expression,
  FilterExpression,
  OrderByExpression,
  SearchExpression,
} from './expressions';
import { ExpandExpression } from './expressions/expand';
import { SelectExpression } from './expressions/select';
import { ODataQueryOptionHandler } from './handlers';

export type ODataQueryArguments<T> = {
  [QueryOption.select]?: Select<T> | SelectExpression<T> | null;
  [QueryOption.expand]?: Expand<T> | ExpandExpression<T> | null;
  [QueryOption.compute]?: string | ComputeExpression<T> | null;
  [QueryOption.filter]?: Filter<T> | FilterExpression<T> | null;
  [QueryOption.search]?: string | SearchExpression<T> | null;
  [QueryOption.transform]?: Transform<T> | null;
  [QueryOption.orderBy]?: OrderBy<T> | OrderByExpression<T> | null;
  [QueryOption.top]?: number | null;
  [QueryOption.skip]?: number | null;
  [QueryOption.skiptoken]?: string | null;
  [QueryOption.format]?: string | null;
  [QueryOption.levels]?: number | 'max' | null;
  [QueryOption.count]?: boolean | null;
};

export class ODataQueryOptions<T> {
  values: Map<QueryOption, any>;

  constructor(values?: Map<QueryOption, any> | { [name: string]: any }) {
    this.values =
      values instanceof Map
        ? values
        : new Map(Object.entries(values || {}) as Array<[QueryOption, any]>);
  }

  // Params
  pathAndParams(escape: boolean = false): [string, { [name: string]: any }] {
    let aliases: QueryCustomType[] = [];
    let options = [
      QueryOption.select,
      QueryOption.filter,
      QueryOption.search,
      QueryOption.compute,
      QueryOption.transform,
      QueryOption.orderBy,
      QueryOption.top,
      QueryOption.skip,
      QueryOption.skiptoken,
      QueryOption.expand,
      QueryOption.format,
      QueryOption.levels,
      QueryOption.count,
    ]
      .filter((key) => !Types.isEmpty(this.values.get(key)))
      .reduce((acc, key) => {
        let value = this.values.get(key);
        if (
          Types.rawType(value).endsWith('Expression') ||
          (Types.isArray(value) &&
            value.some((v: any) => Types.rawType(v).endsWith('Expression')))
        ) {
          value = Types.isArray(value)
            ? value.map((v: Expression<T>) =>
                Types.rawType(v).endsWith('Expression')
                  ? raw(v.render({ aliases }))
                  : v
              )
            : raw((value as Expression<T>).render({ aliases }));
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
      value = 'toJSON' in value ? value.toJSON() : value;
      return Object.assign(acc, { [key]: value });
    }, {});
  }

  toQueryArguments(): ODataQueryArguments<T> {
    return {
      select: this.values.get(QueryOption.select) || null,
      expand: this.values.get(QueryOption.expand) || null,
      transform: this.values.get(QueryOption.transform) || null,
      compute: this.values.get(QueryOption.compute) || null,
      search: this.values.get(QueryOption.search) || null,
      filter: this.values.get(QueryOption.filter) || null,
      orderBy: this.values.get(QueryOption.orderBy) || null,
      top: this.values.get(QueryOption.top) || null,
      skip: this.values.get(QueryOption.skip) || null,
      skiptoken: this.values.get(QueryOption.skiptoken) || null,
      levels: this.values.get(QueryOption.levels) || null,
      count: this.values.get(QueryOption.count) || null,
    } as ODataQueryArguments<T>;
  }

  clone<O>() {
    return new ODataQueryOptions<O>(Objects.clone(this.values));
  }

  // Set Renderable
  expression(key: QueryOption, exp?: Expression<T>) {
    if (exp !== undefined) this.values.set(key, exp);
    return this.values.get(key);
  }

  // Option Handler
  option<O>(key: QueryOption, opts?: O) {
    if (opts !== undefined) this.values.set(key, opts);
    return new ODataQueryOptionHandler<O>(this.values, key);
  }

  // Query Options tools
  has(key: QueryOption) {
    return this.values.has(key);
  }

  remove(...keys: QueryOption[]) {
    [...this.values.keys()]
      .filter((k) => keys.indexOf(k) !== -1)
      .forEach((key) => {
        this.values.delete(key);
      });
  }

  keep(...keys: QueryOption[]) {
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
