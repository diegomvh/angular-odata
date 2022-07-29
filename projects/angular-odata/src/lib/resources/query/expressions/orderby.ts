import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { render, Field, Renderable } from './syntax';

export class OrderByField implements Renderable {
  constructor(protected field: Renderable, protected order: 'asc' | 'desc') {}

  get [Symbol.toStringTag]() {
    return 'OrderByField';
  }

  toJSON() {
    return {
      field: this.field.toJSON(),
      order: this.order,
    };
  }

  render({
    aliases,
    escape,
    prefix,
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
    prefix?: string;
  }): string {
    return `${render(this.field, { aliases, escape, prefix })} ${this.order}`;
  }

  clone() {
    return new OrderByField(this.field.clone(), this.order);
  }
}

export type OrderByExpressionBuilder<T> = {
  t: T;
  e: () => OrderByExpression<T>;
};
export class OrderByExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static expression<T>() {
    return new OrderByExpression<T>();
  }

  static type<T extends object>(): T {
    return Field.factory<T>();
  }

  static orderBy<T extends object>(
    opts: (
      builder: OrderByExpressionBuilder<T>,
      current?: OrderByExpression<T>
    ) => OrderByExpression<T>,
    current?: OrderByExpression<T>
  ): OrderByExpression<T> {
    return opts(
      {
        t: OrderByExpression.type<T>(),
        e: OrderByExpression.expression,
      },
      current
    ) as OrderByExpression<T>;
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

  clone() {
    return new OrderByExpression({
      children: this._children.map((c) => c.clone()),
    });
  }

  ascending(field: any) {
    return this._add(new OrderByField(field, 'asc'));
  }

  descending(field: any) {
    return this._add(new OrderByField(field, 'desc'));
  }
}
