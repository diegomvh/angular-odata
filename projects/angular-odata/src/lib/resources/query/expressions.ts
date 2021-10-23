import { syntax } from './syntax';
import { Field, Connector, Renderable } from './types';

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
  }) {
    this._children = children || [];
    this._connector = connector || Connector.AND;
    this._negated = negated || false;
  }

  static f<T>() {
    return new Expression<T>({ connector: Connector.AND });
  }

  static and<T>() {
    return new Expression<T>({ connector: Connector.AND });
  }

  static or<T>() {
    return new Expression<T>({ connector: Connector.OR });
  }

  static not<T>(exp: Expression<T>) {
    return new Expression<T>({
      children: exp.children(),
      connector: exp.connector(),
      negated: true,
    });
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

  render() {
    let content = this._children
      .map((n) => n.render())
      .join(` ${this._connector} `);
    if (this._negated) {
      content = `not (${content})`;
    }
    return content;
  }

  private _add(node: Renderable, connector?: Connector): Expression<T> {
    if (connector !== undefined && this._connector !== connector) {
      let exp2 = new Expression<T>({
        children: this._children,
        connector: this._connector,
        negated: this._negated,
      });
      this._connector = connector;
      this._children = [
        syntax.grouping(exp2),
        syntax.grouping(node as Expression<T>),
      ];
    } else if (
      node instanceof Expression &&
      !node.negated() &&
      (node.connector() === connector || node.length() === 1)
    ) {
      this._children = [...this._children, ...node.children()];
    } else {
      this._children.push(
        node instanceof Expression ? syntax.grouping(node) : node
      );
    }
    return this;
  }

  or(exp: Expression<T> | ((x: Expression<T>) => Expression<T>)) {
    return this._add(
      typeof exp === 'function' ? exp(new Expression<T>({})) : exp,
      Connector.OR
    );
  }

  and(exp: Expression<T> | ((x: Expression<T>) => Expression<T>)) {
    return this._add(
      typeof exp === 'function' ? exp(new Expression<T>({})) : exp,
      Connector.AND
    );
  }

  eq(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.eq(left, right, normalize));
  }

  ne(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.ne(left, right, normalize));
  }

  gt(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.gt(left, right, normalize));
  }

  ge(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.ge(left, right, normalize));
  }

  lt(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.lt(left, right, normalize));
  }

  le(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.le(left, right, normalize));
  }

  has(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.has(left, right, normalize));
  }

  in(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.in(left, right, normalize));
  }

  contains(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.contains(left, right, normalize));
  }

  startsWith(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.startsWith(left, right, normalize));
  }

  endsWith(left: Field<T>, right: any, normalize?: boolean) {
    return this._add(syntax.endsWith(left, right, normalize));
  }
}
