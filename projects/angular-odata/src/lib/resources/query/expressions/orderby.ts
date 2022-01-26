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
