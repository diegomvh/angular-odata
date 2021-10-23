import { Grouping, operators } from './syntax';
import { Field, Connector, Node } from './types';

export class Expression<T> implements Node {
  private _connector: Connector;
  private _negated: boolean;
  private _children: Node[];
  constructor({
    children,
    connector,
    negated,
  }: {
    children?: Node[];
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

  toString() {
    let content = this._children
      .map((n) => n.toString())
      .join(` ${this._connector} `);
    if (this._negated) {
      content = `not (${content})`;
    }
    return content;
  }

  private _add(node: Node, connector?: Connector): Expression<T> {
    if (connector !== undefined && this._connector !== connector) {
      let exp2 = new Expression<T>({
        children: this._children,
        connector: this._connector,
        negated: this._negated,
      });
      this._connector = connector;
      this._children = [
        new Grouping(exp2),
        new Grouping(node as Expression<T>),
      ];
    } else if (
      node instanceof Expression &&
      !node.negated() &&
      (node.connector() === connector || node.length() === 1)
    ) {
      this._children = [...this._children, ...node.children()];
    } else {
      this._children.push(
        node instanceof Expression ? new Grouping(node) : node
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

  eq(left: Field<T>, right: any) {
    return this._add(operators.eq(left, right));
  }

  ne(left: Field<T>, right: any) {
    return this._add(operators.ne(left, right));
  }

  gt(left: Field<T>, right: number) {
    return this._add(operators.gt(left, right));
  }

  ge(left: Field<T>, right: any) {
    return this._add(operators.ge(left, right));
  }

  lt(left: Field<T>, right: any) {
    return this._add(operators.lt(left, right));
  }

  le(left: Field<T>, right: any) {
    return this._add(operators.le(left, right));
  }

  has(left: Field<T>, right: any) {
    return this._add(operators.has(left, right));
  }

  in(left: Field<T>, right: any) {
    return this._add(operators.in(left, right));
  }
}
