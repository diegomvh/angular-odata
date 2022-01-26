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
  names: string[];
  constructor({
    children,
    names,
  }: {
    children?: Renderable[];
    names?: string[];
  } = {}) {
    super({ children });
    this.names = names || [];
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
    let children = this._children
      .map((n) => n.render({ aliases, escape, prefix }));
    return this.names.map((name, index) => `${children[index]} as ${name}`).join(',');
  }

  private _add(name: string, node: Renderable): ComputeExpression<T> {
    this.names.push(name);
    this._children.push(node);
    return this;
  }

  field<T extends object>(
    name: string,
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ComputeExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(name, node);
  }
}
