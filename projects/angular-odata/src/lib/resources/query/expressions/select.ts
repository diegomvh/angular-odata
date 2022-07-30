import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { Field, Renderable } from './syntax';

export type SelectExpressionBuilder<T> = { t: T; e: () => SelectExpression<T> };
export class SelectExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static expression<T>() {
    return new SelectExpression<T>();
  }

  static type<T extends object>(): T {
    return Field.factory<T>();
  }

  static select<T extends object>(
    opts: (
      builder: SelectExpressionBuilder<T>,
      current?: SelectExpression<T>
    ) => SelectExpression<T>,
    current?: SelectExpression<T>
  ): SelectExpression<T> {
    return opts(
      {
        t: SelectExpression.type<T>(),
        e: SelectExpression.expression,
      },
      current
    ) as SelectExpression<T>;
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
    return this._children
      .map((n) => n.render({ aliases, escape, prefix }))
      .join(',');
  }

  clone() {
    return new SelectExpression({
      children: this._children.map((c) => c.clone()),
    });
  }

  private _add(node: Renderable): SelectExpression<T> {
    this._children.push(node);
    return this;
  }

  field(field: any): SelectExpression<T> {
    return this._add(field);
  }
}
