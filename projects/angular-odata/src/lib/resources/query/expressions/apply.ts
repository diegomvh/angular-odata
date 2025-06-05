import { Parser, ParserOptions } from '../../../types';
import { QueryCustomType } from '../builder';
import { Expression } from './base';
import { FilterConnector, FilterExpression } from './filter';
import { SearchConnector, SearchExpression } from './search';
import {
  FieldFactory,
  functions,
  ODataFunctions,
  ODataOperators,
  operators,
  syntax,
  transformations,
  Renderable,
  RenderableFactory,
  AggregateMethod,
} from './syntax';

export class GroupByTransformations<T> extends Expression<T> {
  protected methods: (AggregateMethod | string)[];
  protected aliases: string[];
  constructor({
    children,
    methods,
    aliases,
  }: {
    children?: Renderable[];
    methods?: (AggregateMethod | string)[];
    aliases?: string[];
  } = {}) {
    super({ children });
    this.methods = methods ?? [];
    this.aliases = aliases ?? [];
  }

  override get [Symbol.toStringTag]() {
    return 'GroupByTransformations';
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, {
      methods: this.methods,
      aliases: this.aliases,
    });
  }

  static fromJson<T>(json: { [name: string]: any }): GroupByTransformations<T> {
    return new GroupByTransformations<T>({
      children: json['children'].map((c: any) =>
        typeof c !== 'string' ? RenderableFactory(c) : c,
      ),
      methods: json['methods'],
      aliases: json['aliases'],
    });
  }

  render({
    aliases,
    escape,
    prefix,
    parser,
    options,
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
    prefix?: string;
    parser?: Parser<T>;
    options?: ParserOptions;
  } = {}): string {
    const children = this._children.map((n) =>
      typeof n !== 'string'
        ? n.render({ aliases, escape, prefix, parser, options })
        : n,
    );
    return `aggregate(${children
      .map((child, index) =>
        !child
          ? `${this.methods[index]} as ${this.aliases[index]}`
          : `${child} with ${this.methods[index]} as ${this.aliases[index]}`,
      )
      .join(',')})`;
  }

  clone() {
    return new GroupByTransformations<T>({
      children: this._children.map((c) =>
        typeof c !== 'string' ? c.clone() : c,
      ),
      methods: this.methods,
      aliases: this.aliases,
    });
  }

  private _add(
    node: Renderable,
    method: AggregateMethod | string,
    alias: string,
  ): GroupByTransformations<T> {
    this._children.push(node);
    this.methods.push(method);
    this.aliases.push(alias);
    return this;
  }

  aggregate(
    value: any,
    method: AggregateMethod | string,
    alias: string,
  ): GroupByTransformations<T> {
    return this._add(value, method, alias);
  }

  sum(value: any, alias: string): GroupByTransformations<T> {
    return this.aggregate(value, 'sum', alias);
  }

  min(value: any, alias: string): GroupByTransformations<T> {
    return this.aggregate(value, 'min', alias);
  }

  max(value: any, alias: string): GroupByTransformations<T> {
    return this.aggregate(value, 'max', alias);
  }

  average(value: any, alias: string): GroupByTransformations<T> {
    return this.aggregate(value, 'average', alias);
  }
  countdistinct(value: any, alias: string): GroupByTransformations<T> {
    return this.aggregate(value, 'countdistinct', alias);
  }

  count(alias: string): GroupByTransformations<T> {
    return this.aggregate('' as any, '$count', alias);
  }
}

export type ApplyExpressionBuilder<T> = {
  t: Required<T>;
  e: () => ApplyExpression<T>;
};
export class ApplyExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  override get [Symbol.toStringTag]() {
    return 'ApplyExpression';
  }

  static factory<T>(
    opts: (
      builder: ApplyExpressionBuilder<T>,
      current: ApplyExpression<T>,
    ) => ApplyExpression<T>,
    current?: ApplyExpression<T>,
  ): ApplyExpression<T> {
    return opts(
      {
        t: FieldFactory<Required<T>>(),
        e: () => new ApplyExpression<T>(),
      },
      current ?? new ApplyExpression<T>(),
    ) as ApplyExpression<T>;
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, {});
  }

  static fromJson<T>(json: { [name: string]: any }): ApplyExpression<T> {
    return new ApplyExpression<T>({
      children: json['children'].map((c: any) => RenderableFactory(c)),
    });
  }

  render({
    aliases,
    escape,
    prefix,
    parser,
    options,
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
    prefix?: string;
    parser?: Parser<T>;
    options?: ParserOptions;
  } = {}): string {
    return this._children
      .map((n) => n.render({ aliases, escape, prefix, parser, options }))
      .join('/');
  }

  clone() {
    return new ApplyExpression<T>({
      children: this._children.map((c) => c.clone()),
    });
  }

  private _add(node: Renderable): ApplyExpression<T> {
    this._children.push(node);
    return this;
  }

  aggregate(
    value: any,
    method: AggregateMethod,
    alias: string,
  ): ApplyExpression<T> {
    return this._add(syntax.aggregate(value, method, alias));
  }

  //topcount
  topCount(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //topsum
  topSum(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //toppercent
  topPercent(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //bottomcount
  bottomCount(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //bottomsum
  bottomSum(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //bottompercent
  bottomPercent(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  identity(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  concat(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //groupby
  groupBy(
    props: (e: { rollup: (f: any) => any }) => any | any[],
    opts?: (e: GroupByTransformations<T>) => GroupByTransformations<T>,
  ): ApplyExpression<T> {
    let properties = props({ rollup: (e: any) => syntax.rollup(e) });
    properties = Array.isArray(properties) ? properties : [properties];
    const transformations =
      opts !== undefined ? opts(new GroupByTransformations()) : undefined;
    return this._add(syntax.groupby(properties, transformations));
  }

  //filter
  filter(
    opts: (e: {
      t: T;
      e: (connector?: FilterConnector) => FilterExpression<T>;
      o: ODataOperators<T>;
      f: ODataFunctions<T>;
    }) => FilterExpression<T>,
  ) {
    const exp = opts({
      t: FieldFactory<Required<T>>(),
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
      e: (connector: FilterConnector = 'and') =>
        new FilterExpression<T>({ connector }),
    }) as FilterExpression<T>;
    return this._add(transformations.filter(exp));
  }

  /*
  orderBy(
    opts: (
      builder: OrderByExpressionBuilder<T>,
      current: OrderByExpression<T>
    ) => OrderByExpression<T>,
    current?: OrderByExpression<T>
  ) {
    const exp = opts(
      {
        t: FieldFactory<Required<T>>(),
        e: () => new OrderByExpression<T>(),
      },
      current ?? new OrderByExpression<T>()
    ) as OrderByExpression<T>;
    return this._add(transformations.orderby(exp));
  }
  */

  //expand
  expand(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //search
  search(
    opts: (e: {
      t: T;
      e: (connector?: SearchConnector) => SearchExpression<T>;
      o: ODataOperators<T>;
      f: ODataFunctions<T>;
    }) => SearchExpression<T>,
  ) {
    const exp = opts({
      t: FieldFactory<Required<T>>(),
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
      e: (connector: SearchConnector = 'AND') =>
        new SearchExpression<T>({ connector }),
    }) as SearchExpression<T>;
    return this._add(transformations.search(exp));
  }

  //compute
  compute(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  /*
  skip(
    total: number
  ): ApplyExpression<T> {
    return this._add(transformations.skip(total));
  }

  top(
    total: number
  ): ApplyExpression<T> {
    return this._add(transformations.top(total));
  }
  */
}
