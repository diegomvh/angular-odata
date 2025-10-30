import { Parser, ParserOptions, QueryOption } from '../../types';
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
  RenderableFactory,
  SearchExpression,
} from './expressions';
import { ApplyExpression } from './expressions/apply';
import { ExpandExpression } from './expressions/expand';
import { SelectExpression } from './expressions/select';
import { ODataQueryOptionHandler } from './handlers';

export type ODataQueryArguments<T> = {
  [QueryOption.select]?: Select<T> | SelectExpression<T> | null;
  [QueryOption.expand]?: Expand<T> | ExpandExpression<T> | null;
  [QueryOption.compute]?: string | ComputeExpression<T> | null;
  [QueryOption.apply]?: string | ApplyExpression<T> | null;
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

// Create a path and params tuple from the query options
export const pathAndParamsFromQueryOptions = <T>(
  values: Map<QueryOption, any>,
  {
    escape,
    parser,
    options,
  }: { escape?: boolean; parser?: Parser<T>; options?: ParserOptions } = {},
): [string, { [name: string]: any }] => {
  const aliases: QueryCustomType[] = [];
  const queryOptions = [
    QueryOption.select,
    QueryOption.filter,
    QueryOption.search,
    QueryOption.compute,
    QueryOption.apply,
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
    .filter((key) => values.has(key) && !Types.isEmpty(values.get(key)))
    .reduce((acc, key) => {
      let value = values.get(key);
      if (
        Types.rawType(value).endsWith('Expression') ||
        (Types.isArray(value) && value.some((v: any) => Types.rawType(v).endsWith('Expression')))
      ) {
        value = Types.isArray(value)
          ? value.map((v: Expression<T>) =>
              Types.rawType(v).endsWith('Expression')
                ? raw(v.render({ aliases, escape, parser, options }))
                : v,
            )
          : raw(
              (value as Expression<T>).render({
                aliases,
                escape,
                parser,
                options,
              }),
            );
      }
      return Object.assign(acc, { [key]: value });
    }, {});
  return buildPathAndQuery<any>({ ...queryOptions, aliases, escape });
};

export class ODataQueryOptions<T> {
  private _values: Map<QueryOption, any>;

  constructor(values?: Map<QueryOption, any>) {
    this._values = values ?? new Map<QueryOption, any>();
  }

  pathAndParams({
    escape,
    parser,
    options,
  }: {
    escape?: boolean;
    parser?: Parser<T>;
    options?: ParserOptions;
  } = {}): [string, { [name: string]: any }] {
    return pathAndParamsFromQueryOptions<T>(this._values, {
      escape,
      parser,
      options,
    });
  }

  toString({ escape, parser }: { escape?: boolean; parser?: Parser<T> } = {}): string {
    const [path, params] = this.pathAndParams({ escape, parser });
    return (
      path +
      Object.entries(params)
        .filter(([, value]) => !Types.isEmpty(value))
        .map(([key, value]) => `${key}=${value}`)
        .join('&')
    );
  }

  toJson() {
    return [...this._values.keys()].reduce((acc, key) => {
      let value = this._values.get(key);
      value = 'toJson' in value ? value.toJson() : value;
      return Object.assign(acc, { [key]: value });
    }, {});
  }

  fromJson<T>(json: { [name: string]: any }): this {
    Object.entries(json || {}).forEach(([key, value]) => {
      this._values.set(key as QueryOption, RenderableFactory(value));
    });
    return this;
  }

  static fromJson<T>(json: { [name: string]: any }): ODataQueryOptions<T> {
    const entries = Object.entries(json || {}).map(([key, value]) => [
      key,
      RenderableFactory(value),
    ]) as [QueryOption, any][];
    new Map(entries);
    return new ODataQueryOptions<T>(new Map(entries));
  }

  toQueryArguments(): ODataQueryArguments<T> {
    return {
      select: this._values.get(QueryOption.select) ?? null,
      expand: this._values.get(QueryOption.expand) ?? null,
      transform: this._values.get(QueryOption.transform) ?? null,
      compute: this._values.get(QueryOption.compute) ?? null,
      apply: this._values.get(QueryOption.apply) ?? null,
      search: this._values.get(QueryOption.search) ?? null,
      filter: this._values.get(QueryOption.filter) ?? null,
      orderBy: this._values.get(QueryOption.orderBy) ?? null,
      top: this._values.get(QueryOption.top) ?? null,
      skip: this._values.get(QueryOption.skip) ?? null,
      skiptoken: this._values.get(QueryOption.skiptoken) ?? null,
      levels: this._values.get(QueryOption.levels) ?? null,
      count: this._values.get(QueryOption.count) ?? null,
    } as ODataQueryArguments<T>;
  }

  clone<O>() {
    return new ODataQueryOptions<O>(Objects.clone(this._values));
  }

  // Set Renderable
  expression(key: QueryOption, exp?: Expression<T>) {
    if (exp !== undefined) this._values.set(key, exp);
    return this._values.get(key);
  }

  // Option Handler
  option<O>(key: QueryOption, opts?: O) {
    if (opts !== undefined) this._values.set(key, opts);
    return new ODataQueryOptionHandler<O>(this._values, key);
  }

  // Query Options tools
  has(key: QueryOption) {
    return this._values.has(key);
  }

  remove(...keys: QueryOption[]) {
    for (let key of this._values.keys()) {
      if (keys.includes(key)) this._values.delete(key);
    }
  }

  keep(...keys: QueryOption[]) {
    for (let key of this._values.keys()) {
      if (!keys.includes(key)) this._values.delete(key);
    }
  }

  // Clear
  clear() {
    this._values.clear();
  }
}
