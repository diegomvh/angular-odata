import { Parser, ParserOptions } from '../../../types';
import { QueryCustomType } from '../builder';
import { Expression } from './base';
import { CountExpression, CountField } from './count';
import {
  FieldFactory,
  functions,
  Normalize,
  ODataFunctions,
  ODataOperators,
  operators,
  Renderable,
  RenderableFactory,
  syntax,
} from './syntax';

export type FilterConnector = 'and' | 'or';

export type FilterExpressionBuilder<T> = {
  t: Required<T>;
  e: (connector?: FilterConnector) => FilterExpression<T>;
  o: ODataOperators<T>;
  f: ODataFunctions<T>;
};
export class FilterExpression<F> extends Expression<F> {
  private _connector: FilterConnector;
  private _negated: boolean;
  constructor({
    children,
    connector,
    negated,
  }: {
    children?: Renderable[];
    connector?: FilterConnector;
    negated?: boolean;
  } = {}) {
    super({ children });
    this._connector = connector ?? 'and';
    this._negated = negated ?? false;
  }

  override get [Symbol.toStringTag]() {
    return 'FilterExpression';
  }

  static factory<T>(
    opts: (
      builder: FilterExpressionBuilder<T>,
      current: FilterExpression<T>,
    ) => FilterExpression<T>,
    current?: FilterExpression<T>,
  ): FilterExpression<T> {
    return opts(
      {
        e: (connector: FilterConnector = 'and') =>
          new FilterExpression<T>({ connector }),
        t: FieldFactory<Required<T>>(),
        o: operators as ODataOperators<T>,
        f: functions as ODataFunctions<T>,
      },
      current ?? new FilterExpression<T>(),
    ) as FilterExpression<T>;
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, {
      connector: this._connector,
      negated: this._negated,
    });
  }

  static fromJson<T>(json: { [name: string]: any }): FilterExpression<T> {
    return new FilterExpression<T>({
      children: json['children'].map((c: any) => RenderableFactory(c)),
      connector: json['connector'],
      negated: json['negated'],
    });
  }

  connector() {
    return this._connector;
  }

  negated() {
    return this._negated;
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
    parser?: Parser<any>;
    options?: ParserOptions;
  } = {}): string {
    let content = this._children
      .map((n) => n.render({ aliases, escape, prefix, parser, options }))
      .join(` ${this._connector} `);
    if (this._negated) {
      content = `not (${content})`;
    }
    return content;
  }

  clone() {
    return new FilterExpression<F>({
      children: this._children.map((c) => c.clone()),
      connector: this._connector,
      negated: this._negated,
    });
  }

  private _add(
    node: Renderable,
    connector?: FilterConnector,
  ): FilterExpression<F> {
    if (connector !== undefined && this._connector !== connector) {
      let children: Renderable[] = [];
      if (this._children.length > 0) {
        if (this._children.length === 1) {
          children = [...this._children];
        } else {
          let exp = new FilterExpression<F>({
            children: this._children,
            connector: this._connector,
            negated: this._negated,
          });
          if (exp.length() > 1) {
            children.push(syntax.group(exp));
          } else {
            children.push(exp);
          }
        }
      }
      if (
        node instanceof FilterExpression &&
        (node.connector() === connector || node.length() === 1)
      ) {
        children = [...children, ...node.children()];
      } else {
        children.push(syntax.group(node));
      }
      this._connector = connector;
      this._children = children;
    } else if (
      node instanceof FilterExpression &&
      !node.negated() &&
      (node.connector() === connector || node.length() === 1)
    ) {
      this._children = [...this._children, ...node.children()];
    } else {
      this._children.push(
        node instanceof FilterExpression && !node.negated()
          ? syntax.group(node)
          : node,
      );
    }
    return this;
  }

  or(exp: FilterExpression<F>): FilterExpression<F> {
    return this._add(exp, 'or');
  }

  and(exp: FilterExpression<F>): FilterExpression<F> {
    return this._add(exp, 'and');
  }

  not(exp: FilterExpression<F>): FilterExpression<F> {
    const notExp = new FilterExpression<F>({
      children: exp.children(),
      connector: exp.connector(),
      negated: true,
    });

    return this._add(notExp, this._connector);
  }

  eq(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(operators.eq(left, right, normalize));
  }

  ne(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(operators.ne(left, right, normalize));
  }

  gt(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(operators.gt(left, right, normalize));
  }

  ge(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(operators.ge(left, right, normalize));
  }

  lt(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(operators.lt(left, right, normalize));
  }

  le(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(operators.le(left, right, normalize));
  }

  has(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(operators.has(left, right, normalize));
  }

  in(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(operators.in(left, right, normalize));
  }

  contains(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(functions.contains(left, right, normalize));
  }

  startsWith(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(functions.startsWith(left, right, normalize));
  }

  endsWith(left: any, right: any, normalize: Normalize = 'right') {
    return this._add(functions.endsWith(left, right, normalize));
  }

  any<N>(
    left: N[],
    opts?: (e: {
      e: (connector?: FilterConnector) => FilterExpression<N>;
      t: N;
      o: ODataOperators<N>;
      f: ODataFunctions<N>;
    }) => FilterExpression<N>,
    alias?: string,
  ): FilterExpression<F> {
    let exp = undefined;
    if (opts !== undefined) {
      exp = opts({
        t: FieldFactory<Required<N>>(),
        o: operators as ODataOperators<N>,
        f: functions as ODataFunctions<N>,
        e: (connector: FilterConnector = 'and') =>
          new FilterExpression<N>({ connector }),
      }) as FilterExpression<N>;
    }
    return this._add(syntax.any(left, exp, alias));
  }

  all<N>(
    left: N[],
    opts?: (e: {
      t: N;
      e: (connector?: FilterConnector) => FilterExpression<N>;
      o: ODataOperators<N>;
      f: ODataFunctions<N>;
    }) => FilterExpression<N>,
    alias?: string,
  ): FilterExpression<F> {
    let exp = undefined;
    if (opts !== undefined) {
      exp = opts({
        t: FieldFactory<Required<N>>(),
        o: operators as ODataOperators<N>,
        f: functions as ODataFunctions<N>,
        e: (connector: FilterConnector = 'and') =>
          new FilterExpression<N>({ connector }),
      }) as FilterExpression<N>;
    }
    return this._add(syntax.all(left, exp, alias));
  }

  count<N>(
    left: N[],
    opts?: (e: { t: N; f: CountField<N> }) => CountExpression<N>,
  ): FilterExpression<F> {
    return this._add(new CountExpression<N>().field(left, opts));
  }

  isof(type: string): FilterExpression<F>;
  isof(left: F, type: string): FilterExpression<F>;
  isof(left: any, type?: string): FilterExpression<F> {
    return this._add(syntax.isof(left, type));
  }

  combine(
    exp: FilterExpression<F>,
    connector: FilterConnector = 'and',
  ): FilterExpression<F> {
    return this._add(exp, connector);
  }
}
