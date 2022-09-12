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

export type ComputeExpressionBuilder<T> = {
  t: Required<Readonly<T>>;
  e: () => ComputeExpression<T>;
};
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

  static compute<T extends object>(
    opts: (
      builder: ComputeExpressionBuilder<T>,
      current?: ComputeExpression<T>
    ) => ComputeExpression<T>,
    current?: ComputeExpression<T>
  ): ComputeExpression<T> {
    return opts(
      {
        t: Field.factory<Readonly<Required<T>>>(),
        e: () => new ComputeExpression<T>()
      },
      current
    ) as ComputeExpression<T>;
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
    let children = this._children.map((n) =>
      n.render({ aliases, escape, prefix })
    );
    return this.names
      .map((name, index) => `${children[index]} as ${name}`)
      .join(',');
  }

  clone() {
    return new ComputeExpression({
      children: this._children.map((c) => c.clone()),
      names: [...this.names],
    });
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
