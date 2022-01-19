import type { QueryCustomType } from './builder';
import {
  Field,
  functions,
  Grouping,
  ODataFunctions,
  ODataOperators,
  operators,
  OrderByField,
  Renderable,
  SearchTerm,
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
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
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
            children.push(new Grouping(exp));
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
        children.push(new Grouping(node));
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
          ? new Grouping(node)
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

  private _add(node: Renderable): OrderByExpression<T> {
    this._children.push(node);
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
    return this._add(new OrderByField(field, 'asc'));
  }

  descending(field: any) {
    return this._add(new OrderByField(field, 'desc'));
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

  static compute<T extends object>(
    opts: (e: {
      s: T;
      e: () => ComputeExpression<T>;
      o: ODataOperators<T>;
      f: ODataFunctions<T>;
    }) => ComputeExpression<T>
  ): ComputeExpression<T> {
    return opts({
      s: ComputeExpression.s<T>(),
      e: ComputeExpression.e,
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    }) as ComputeExpression<T>;
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
    this._children.push(node);
    return this;
  }

  add(left: any, right: any, name: string, normalize?: boolean) {
    return this._add(operators.add(left, right, normalize), name);
  }

  sub(left: any, right: any, name: string, normalize?: boolean) {
    return this._add(operators.sub(left, right, normalize), name);
  }

  mul(left: any, right: any, name: string, normalize?: boolean) {
    return this._add(operators.mul(left, right, normalize), name);
  }

  div(left: any, right: any, name: string, normalize?: boolean) {
    return this._add(operators.div(left, right, normalize), name);
  }

  mod(left: any, right: any, name: string, normalize?: boolean) {
    return this._add(operators.mod(left, right, normalize), name);
  }

  neg(value: any, name: string, normalize?: boolean) {
    return this._add(operators.neg(value, normalize), name);
  }
}

export class SearchExpression<T> extends Expression<T> {
  private _connector: SearchConnector;
  private _negated: boolean;
  constructor({
    children,
    connector,
    negated,
  }: {
    children?: Renderable[];
    connector?: SearchConnector;
    negated?: boolean;
  } = {}) {
    super({ children });
    this._connector = connector || 'AND';
    this._negated = negated || false;
  }

  static e<T>(connector: SearchConnector = 'AND') {
    return new SearchExpression<T>({ connector });
  }

  static search<T extends object>(
    opts: (e: {
      e: (connector?: SearchConnector) => SearchExpression<T>;
    }) => SearchExpression<T>
  ): SearchExpression<T> {
    return opts({
      e: SearchExpression.e,
    }) as SearchExpression<T>;
  }

  private _add(
    node: Renderable,
    connector?: SearchConnector
  ): SearchExpression<T> {
    if (connector !== undefined && this._connector !== connector) {
      let children: Renderable[] = [];
      if (this._children.length > 0) {
        if (this._children.length === 1) {
          children = [...this._children];
        } else {
          let exp = new SearchExpression<T>({
            children: this._children,
            connector: this._connector,
            negated: this._negated,
          });
          if (exp.length() > 1) {
            children.push(new Grouping(exp));
          } else {
            children.push(exp);
          }
        }
      }
      if (
        node instanceof SearchExpression &&
        (node.connector() === connector || node.length() === 1)
      ) {
        children = [...children, ...node.children()];
      } else {
        children.push(new Grouping(node));
      }
      this._connector = connector;
      this._children = children;
    } else if (
      node instanceof SearchExpression &&
      !node.negated() &&
      (node.connector() === connector || node.length() === 1)
    ) {
      this._children = [...this._children, ...node.children()];
    } else {
      this._children.push(
        node instanceof SearchExpression && !node.negated()
          ? new Grouping(node)
          : node
      );
    }
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
      negated: this._negated,
    };
  }

  connector() {
    return this._connector;
  }

  negated() {
    return this._negated;
  }

  or(exp: SearchExpression<T>): SearchExpression<T> {
    return this._add(exp, 'OR');
  }

  and(exp: SearchExpression<T>): SearchExpression<T> {
    return this._add(exp, 'AND');
  }

  not(exp: SearchExpression<T>): SearchExpression<T> {
    const notExp = new SearchExpression<T>({
      children: exp.children(),
      connector: exp.connector(),
      negated: true,
    });

    return this._add(notExp, this._connector);
  }

  term(value: any) {
    return this._add(new SearchTerm(value));
  }
}
