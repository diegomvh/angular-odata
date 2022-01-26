import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import {
  Field,
  functions,
  ODataFunctions,
  ODataOperators,
  operators,
  Renderable,
} from './syntax';

export class SelectExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static e<T>() {
    return new SelectExpression<T>();
  }

  static s<T extends object>(): T {
    return Field.factory<T>();
  }

  static select<T extends object>(
    opts: (e: { s: T; e: () => SelectExpression<T> }) => SelectExpression<T>
  ): SelectExpression<T> {
    return opts({
      s: SelectExpression.s<T>(),
      e: SelectExpression.e,
    }) as SelectExpression<T>;
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

  private _add(node: Renderable): SelectExpression<T> {
    this._children.push(node);
    return this;
  }

  field(field: any): SelectExpression<T> {
    return this._add(field);
  }
}
