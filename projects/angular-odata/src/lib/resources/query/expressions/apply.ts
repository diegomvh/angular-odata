import { Parser, ParserOptions } from '../../../types';
import { Objects } from '../../../utils';
import type { QueryCustomType } from '../builder';
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

class GroupByTransformations<T> implements Renderable {
  render({
    aliases,
    escape,
    prefix,
    parser,
    options,
  }: {
    aliases?: QueryCustomType[] | undefined;
    escape?: boolean | undefined;
    prefix?: string | undefined;
    parser?: Parser<any> | undefined;
    options?: ParserOptions | undefined;
  }): string {
    throw new Error('Method not implemented.');
  }
  toString(): string {
    throw new Error('Method not implemented.');
  }
  toJson() {
    throw new Error('Method not implemented.');
  }
  clone() {
    throw new Error('Method not implemented.');
  }
  resolve(parser: any) {
    throw new Error('Method not implemented.');
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

  get [Symbol.toStringTag]() {
    return 'ApplyExpression';
  }

  static factory<T>(
    opts: (
      builder: ApplyExpressionBuilder<T>,
      current?: ApplyExpression<T>
    ) => ApplyExpression<T>,
    current?: ApplyExpression<T>
  ): ApplyExpression<T> {
    return opts(
      {
        t: FieldFactory<Required<T>>(),
        e: () => new ApplyExpression<T>(),
      },
      current
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

  private _add(node: Renderable): ApplyExpression<any> {
    this._children.push(node);
    return this;
  }

  aggregate(
    value: any,
    method: AggregateMethod,
    alias: string
  ): ApplyExpression<T> {
    return this._add(syntax.aggregate(value, method, alias));
  }

  //topcount
  topCount(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //topsum
  topSum(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //toppercent
  topPercent(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //bottomcount
  bottomCount(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //bottomsum
  bottomSum(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //bottompercent
  bottomPercent(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  identity(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  concat(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
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
    opts?: (e: GroupByTransformations<T>) => GroupByTransformations<T>
  ): ApplyExpression<T> {
    let properties = props({ rollup: (e: any) => syntax.rollup(e) });
    properties = Array.isArray(properties) ? properties : [properties];
    let options = undefined;
    if (opts !== undefined) options = opts(new GroupByTransformations());
    return this._add(syntax.groupby(properties, options));
  }

  //filter
  filter(
    opts: (e: {
      t: T;
      e: (connector?: FilterConnector) => FilterExpression<T>;
      o: ODataOperators<T>;
      f: ODataFunctions<T>;
    }) => FilterExpression<T>
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

  //expand
  expand(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
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
    }) => SearchExpression<T>
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
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }
}
