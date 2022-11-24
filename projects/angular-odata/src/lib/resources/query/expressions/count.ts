import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { render, Field, Renderable } from './syntax';

export class CountField implements Renderable {
  constructor(protected field: Renderable) {}

  get [Symbol.toStringTag]() {
    return 'CountField';
  }

  toJSON() {
    return {
      field: this.field.toJSON(),
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
    return new CountField(this.field.clone());
  }
}

export type CountExpressionBuilder<T> = {
  t: Readonly<Required<T>>;
  e: () => CountExpression<T>;
};
export class CountExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static orderBy<T extends object>(
    opts: (
      builder: CountExpressionBuilder<T>,
      current?: CountExpression<T>
    ) => CountExpression<T>,
    current?: CountExpression<T>
  ): CountExpression<T> {
    return opts(
      {
        t: Field.factory<Readonly<Required<T>>>(),
        e: () => new CountExpression<T>(),
      },
      current
    ) as CountExpression<T>;
  }

  private _add(node: Renderable): CountExpression<T> {
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
    return new CountExpression({
      children: this._children.map((c) => c.clone()),
    });
  }
}
