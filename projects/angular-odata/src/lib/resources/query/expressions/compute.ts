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

export class ComputeExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static e<T>() {
    return new ComputeExpression<T>();
  }

  static s<T extends object>(): T {
    return Field.factory<T>();
  }

  static compute<T extends object>(
    opts: (e: { s: T; e: () => ComputeExpression<T> }) => ComputeExpression<T>
  ): ComputeExpression<T> {
    return opts({
      s: ComputeExpression.s<T>(),
      e: ComputeExpression.e,
    }) as ComputeExpression<T>;
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

  private _add(node: Renderable, name: string): ComputeExpression<T> {
    this._children.push(node);
    return this;
  }

  compute<T extends object>(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
    name: string
  ): ComputeExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node, name);
  }
}
