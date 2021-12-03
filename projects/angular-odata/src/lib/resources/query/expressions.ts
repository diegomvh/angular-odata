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

export type Connector = 'and' | 'or';

export class Expression<T> implements Renderable {
  private _connector: Connector;
  private _negated: boolean;
  private _children: Renderable[];
  constructor({
    children,
    connector,
    negated,
  }: {
    children?: Renderable[];
    connector?: Connector;
    negated?: boolean;
  } = {}) {
    this._children = children || [];
    this._connector = connector || 'and';
    this._negated = negated || false;
  }

  get [Symbol.toStringTag]() {
    return 'Expression';
  }

  static s<T extends object>(): T {
    return Field.factory<T>();
  }

  static e<T>(connector: Connector = 'and') {
    return new Expression<T>({ connector });
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
      e: (connector?: Connector) => Expression<T>;
      o: ODataOperators<T>;
      f: ODataFunctions<T>;
    }) => Expression<T>
  ): Expression<T> {
    return opts({
      s: Field.factory<T>(),
      e: Expression.e,
      o: operators,
      f: functions,
    }) as Expression<T>;
  }

  toJSON() {
    return {
      children: this._children.map((c) => c.toJSON()),
      connector: this._connector,
      negated: this._negated,
    };
  }

  children() {
    return this._children;
  }

  connector() {
    return this._connector;
  }

  negated() {
    return this._negated;
  }

  length() {
    return this._children.length;
  }

  render({
    aliases,
    escape,
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
  } = {}): string {
    let content = this._children
      .map((n) => n.render({ aliases, escape }))
      .join(` ${this._connector} `);
    if (this._negated) {
      content = `not (${content})`;
    }
    return content;
  }

  private _add(node: Renderable, connector?: Connector): Expression<T> {
    if (connector !== undefined && this._connector !== connector) {
      let children: Renderable[] = [];
      if (this._children.length > 0) {
        if (this._children.length === 1) {
          children = [...this._children];
        } else {
          let exp = new Expression<T>({
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
        node instanceof Expression &&
        (node.connector() === connector || node.length() === 1)
      ) {
        children = [...children, ...node.children()];
      } else {
        children.push(syntax.grouping(node));
      }
      this._connector = connector;
      this._children = children;
    } else if (
      node instanceof Expression &&
      !node.negated() &&
      (node.connector() === connector || node.length() === 1)
    ) {
      this._children = [...this._children, ...node.children()];
    } else {
      this._children.push(
        node instanceof Expression && !node.negated()
          ? syntax.grouping(node)
          : node
      );
    }
    return this;
  }

  or(exp: Expression<T>): Expression<T> {
    return this._add(exp, 'or');
  }

  and(exp: Expression<T>): Expression<T> {
    return this._add(exp, 'and');
  }

  not(exp: Expression<T>): Expression<T> {
    const notExp = new Expression<T>({
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

  any<N>(
    left: any,
    exp: Expression<N> | ((x: Expression<N>) => Expression<N>)
  ) {
    return this._add(
      syntax.any(
        left,
        typeof exp === 'function' ? exp(new Expression<N>()) : exp
      )
    );
  }

  all<N>(
    left: any,
    exp: Expression<N> | ((x: Expression<N>) => Expression<N>)
  ) {
    return this._add(
      syntax.all(
        left,
        typeof exp === 'function' ? exp(new Expression<N>()) : exp
      )
    );
  }

  isof(type: string): Expression<T>;
  isof(left: T, type: string): Expression<T>;
  isof(left: any, type?: string): Expression<T> {
    return this._add(syntax.isof(left, type));
  }
}

/*
export class FilterExpression<T> extends Expression<T> {
  constructor({
    children,
    connector,
    negated,
  }: {
    children?: Renderable[];
    connector?: Connector;
    negated?: boolean;
  } = {}) {
    super({ children, connector, negated });
  }

  get [Symbol.toStringTag]() {
    return 'FilterExpression';
  }

  static e<T>() {
    return new FilterExpression<T>({ connector: Connector.AND });
  }

  static and<T>() {
    return new FilterExpression<T>({ connector: Connector.AND });
  }

  static or<T>() {
    return new FilterExpression<T>({ connector: Connector.OR });
  }

  static not<T>(exp: FilterExpression<T>) {
    return new FilterExpression<T>({
      children: exp.children(),
      connector: exp.connector(),
      negated: true,
    });
  }
}
*/
