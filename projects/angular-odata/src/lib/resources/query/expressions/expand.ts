import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { Field, render, Renderable } from './syntax';

export class ExpandField<T> implements Renderable {
  constructor(protected field: Renderable) {}

  get [Symbol.toStringTag]() {
    return 'ExpandField';
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
    return `${render(this.field, { aliases, escape, prefix })}`;
  }

  select() {}
  filter() {}
  levels() {}
  orderBy() {}
  top() {}
  skip() {}
}

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

  field<T extends object>(
    field: any,
    opts?: (e: ExpandField<keyof T>) => void
  ): ExpandExpression<T> {
    let node = new ExpandField(field);
    if (opts !== undefined) opts(node as ExpandField<keyof T>);
    return this._add(node);
  }
}
