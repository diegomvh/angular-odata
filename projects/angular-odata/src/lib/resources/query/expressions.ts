import type { QueryCustomType } from './builder';
import {
  Field,
  functions,
  ODataFunctions,
  ODataOperators,
  operators,
  Renderable,
} from './syntax';
import { syntax } from './syntax';

export type FilterConnector = 'and' | 'or';
export type SearchConnector = 'AND' | 'OR';

export abstract class Expression<T> implements Renderable {
  protected _children: Renderable[];
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    this._children = children || [];
  }

  get [Symbol.toStringTag]() {
    return 'Expression';
  }

  abstract render({
    aliases,
    escape,
    prefix,
  }: {
    aliases?: QueryCustomType[] | undefined;
    escape?: boolean | undefined;
    prefix?: string | undefined;
  }): string;

  children() {
    return this._children;
  }

  length() {
    return this._children.length;
  }

  toJSON() {
    return {
      children: this._children.map((c) => c.toJSON()),
    };
  }
}

export class FilterExpression<T> extends Expression<T> {
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
    this._connector = connector || 'and';
    this._negated = negated || false;
  }

  static s<T extends object>(): T {
    return Field.factory<T>();
  }

  static e<T>(connector: FilterConnector = 'and') {
    return new FilterExpression<T>({ connector });
  }

  static o<T>(): ODataOperators<T> {
    return operators;
  }

  static f<T>(): ODataFunctions<T> {
    return functions;
  }

  static filter<T extends object>(
    opts: (e: {
      s: T;
      e: (connector?: FilterConnector) => FilterExpression<T>;
      o: ODataOperators<T>;
      f: ODataFunctions<T>;
    }) => FilterExpression<T>
  ): FilterExpression<T> {
    return opts({
      s: FilterExpression.s<T>(),
      e: FilterExpression.e,
      o: FilterExpression.o<T>(),
      f: FilterExpression.f<T>(),
    }) as FilterExpression<T>;
  }

  override toJSON() {
    return {
      children: this._children.map((c) => c.toJSON()),
      connector: this._connector,
      negated: this._negated,
    };
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
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
    prefix?: string;
  } = {}): string {
    let content = this._children
      .map((n) => n.render({ aliases, escape, prefix }))
      .join(` ${this._connector} `);
    if (this._negated) {
      content = `not (${content})`;
    }
    return content;
  }

  private _add(
    node: Renderable,
    connector?: FilterConnector
  ): FilterExpression<T> {
    if (connector !== undefined && this._connector !== connector) {
      let children: Renderable[] = [];
      if (this._children.length > 0) {
        if (this._children.length === 1) {
          children = [...this._children];
        } else {
          let exp = new FilterExpression<T>({
            children: this._children,
            connector: this._connector,
            negated: this._negated,
          });
          if (exp.length() > 1) {
            children.push(syntax.grouping(exp));
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
        children.push(syntax.grouping(node));
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
          ? syntax.grouping(node)
          : node
      );
    }
    return this;
  }

  or(exp: FilterExpression<T>): FilterExpression<T> {
    return this._add(exp, 'or');
  }

  and(exp: FilterExpression<T>): FilterExpression<T> {
    return this._add(exp, 'and');
  }

  not(exp: FilterExpression<T>): FilterExpression<T> {
    const notExp = new FilterExpression<T>({
      children: exp.children(),
      connector: exp.connector(),
      negated: true,
    });

    return this._add(notExp, this._connector);
  }

  eq(left: any, right: any, normalize?: boolean) {
    return this._add(operators.eq(left, right, normalize));
  }

  ne(left: any, right: any, normalize?: boolean) {
    return this._add(operators.ne(left, right, normalize));
  }

  gt(left: any, right: any, normalize?: boolean) {
    return this._add(operators.gt(left, right, normalize));
  }

  ge(left: any, right: any, normalize?: boolean) {
    return this._add(operators.ge(left, right, normalize));
  }

  lt(left: any, right: any, normalize?: boolean) {
    return this._add(operators.lt(left, right, normalize));
  }

  le(left: any, right: any, normalize?: boolean) {
    return this._add(operators.le(left, right, normalize));
  }

  has(left: any, right: any, normalize?: boolean) {
    return this._add(operators.has(left, right, normalize));
  }

  in(left: any, right: any, normalize?: boolean) {
    return this._add(operators.in(left, right, normalize));
  }

  contains(left: any, right: any, normalize?: boolean) {
    return this._add(functions.contains(left, right, normalize));
  }

  startsWith(left: any, right: any, normalize?: boolean) {
    return this._add(functions.startsWith(left, right, normalize));
  }

  endsWith(left: any, right: any, normalize?: boolean) {
    return this._add(functions.endsWith(left, right, normalize));
  }

  any<N extends object>(
    left: N[],
    opts: (e: {
      s: N;
      e: (connector?: FilterConnector) => FilterExpression<N>;
    }) => FilterExpression<N>,
    alias?: string
  ): FilterExpression<T> {
    const exp = opts({
      s: Field.factory<N>(),
      e: FilterExpression.e,
    }) as FilterExpression<N>;
    return this._add(syntax.any(left, exp, alias));
  }

  all<N extends object>(
    left: N[],
    opts: (e: {
      s: N;
      e: (connector?: FilterConnector) => FilterExpression<N>;
    }) => FilterExpression<N>,
    alias?: string
  ): FilterExpression<T> {
    const exp = opts({
      s: Field.factory<N>(),
      e: FilterExpression.e,
    }) as FilterExpression<N>;
    return this._add(syntax.all(left, exp, alias));
  }

  isof(type: string): FilterExpression<T>;
  isof(left: T, type: string): FilterExpression<T>;
  isof(left: any, type?: string): FilterExpression<T> {
    return this._add(syntax.isof(left, type));
  }
}

export class OrderByExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static e<T>() {
    return new OrderByExpression<T>();
  }

  static s<T extends object>(): T {
    return Field.factory<T>();
  }

  static orderBy<T extends object>(
    opts: (e: { s: T; e: () => OrderByExpression<T> }) => OrderByExpression<T>
  ): OrderByExpression<T> {
    return opts({
      s: OrderByExpression.s<T>(),
      e: OrderByExpression.e,
    }) as OrderByExpression<T>;
  }

  private _add(
    field: Renderable,
    order?: 'asc' | 'desc'
  ): OrderByExpression<T> {
    return this;
  }

  render({
    aliases,
    escape,
    prefix,
  }: {
    aliases?: QueryCustomType[] | undefined;
    escape?: boolean | undefined;
    prefix?: string | undefined;
  } = {}): string {
    let content = this._children
      .map((n) => n.render({ aliases, escape, prefix }))
      .join(`,`);
    return content;
  }

  ascending(field: any) {
    return this._add(field, 'asc');
  }

  descending(field: any) {
    return this._add(field, 'desc');
  }
}

export class ComputeExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static e<T>() {
    return new ComputeExpression<T>();
  }

  static s<T extends object>(): T {
    return Field.factory<T>();
  }

  static o<T>(): ODataOperators<T> {
    return operators;
  }

  static f<T>(): ODataFunctions<T> {
    return functions;
  }

  render({
    aliases,
    escape,
    prefix,
  }: {
    aliases?: QueryCustomType[] | undefined;
    escape?: boolean | undefined;
    prefix?: string | undefined;
  } = {}): string {
    let content = this._children
      .map((n) => n.render({ aliases, escape, prefix }))
      .join(`,`);
    return content;
  }

  private _add(node: Renderable, name: string): ComputeExpression<T> {
    return this;
  }

  compute(value: any, name: string) {
    return this._add(value, name);
  }
}

export class SearchExpression<T> extends Expression<T> {
  private _connector: SearchConnector;
  constructor({
    children,
    connector,
  }: {
    children?: Renderable[];
    connector?: SearchConnector;
  } = {}) {
    super({ children });
    this._connector = connector || 'AND';
  }

  static e<T>() {
    return new OrderByExpression<T>();
  }

  static s<T extends object>(): T {
    return Field.factory<T>();
  }

  private _add(
    field: Renderable,
    order?: SearchConnector
  ): SearchExpression<T> {
    return this;
  }

  render({
    aliases,
    escape,
    prefix,
  }: {
    aliases?: QueryCustomType[] | undefined;
    escape?: boolean | undefined;
    prefix?: string | undefined;
  } = {}): string {
    let content = this._children
      .map((n) => n.render({ aliases, escape, prefix }))
      .join(` ${this._connector} `);
    return content;
  }

  override toJSON() {
    return {
      children: this._children.map((c) => c.toJSON()),
      connector: this._connector,
    };
  }
}
