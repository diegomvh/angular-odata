import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { Field, Renderable } from './syntax';

export class ExpandExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static e<T>() {
    return new ExpandExpression<T>();
  }

  static s<T extends object>(): T {
    return Field.factory<T>();
  }

  static expand<T extends object>(
    opts: (e: { s: T; e: () => ExpandExpression<T> }) => ExpandExpression<T>
  ): ExpandExpression<T> {
    return opts({
      s: ExpandExpression.s<T>(),
      e: ExpandExpression.e,
    }) as ExpandExpression<T>;
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

  private _add(node: Renderable): ExpandExpression<T> {
    this._children.push(node);
    return this;
  }

  field<T extends object>(field: Renderable): ExpandExpression<T> {
    return this._add(field);
  }
}
