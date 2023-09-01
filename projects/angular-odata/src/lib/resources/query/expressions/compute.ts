import { Parser } from '../../../types';
import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import {
  FieldFactory,
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

  static compute<T>(
    opts: (
      builder: ComputeExpressionBuilder<T>,
      current?: ComputeExpression<T>,
    ) => ComputeExpression<T>,
    current?: ComputeExpression<T>,
  ): ComputeExpression<T> {
    return opts(
      {
        t: FieldFactory<Readonly<Required<T>>>(),
        e: () => new ComputeExpression<T>(),
      },
      current,
    ) as ComputeExpression<T>;
  }

  render({
    aliases,
    escape,
    prefix,
    parser,
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
    prefix?: string;
    parser?: Parser<T>;
  } = {}): string {
    let children = this._children.map((n) =>
      n.render({ aliases, escape, prefix, parser }),
    );
    return this.names
      .map((name, index) => `${children[index]} as ${name}`)
      .join(',');
  }

  clone() {
    return new ComputeExpression<T>({
      children: this._children.map((c) => c.clone()),
      names: [...this.names],
    });
  }

  private _add(name: string, node: Renderable): ComputeExpression<any> {
    this.names.push(name);
    this._children.push(node);
    return this;
  }

  field<T>(
    name: string,
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable,
  ): ComputeExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(name, node);
  }
}
