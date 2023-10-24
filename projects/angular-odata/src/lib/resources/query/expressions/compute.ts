import { Parser, ParserOptions } from '../../../types';
import { Types } from '../../../utils';
import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import {
  FieldFactory,
  functions,
  ODataFunctions,
  ODataOperators,
  operators,
  Renderable,
  RenderableFactory,
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

  get [Symbol.toStringTag]() {
    return 'ComputeExpression';
  }

  static factory<T>(
    opts: (
      builder: ComputeExpressionBuilder<T>,
      current?: ComputeExpression<T>
    ) => ComputeExpression<T>,
    current?: ComputeExpression<T>
  ): ComputeExpression<T> {
    return opts(
      {
        t: FieldFactory<Readonly<Required<T>>>(),
        e: () => new ComputeExpression<T>(),
      },
      current
    ) as ComputeExpression<T>;
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, {
      names: this.names,
    });
  }

  static fromJson<T>(json: { [name: string]: any }): ComputeExpression<T> {
    return new ComputeExpression<T>({
      children: json['children'].map((c: any) => RenderableFactory(c)),
      names: json['names'],
    });
  }

  render({
    aliases,
    escape,
    prefix,
    parser,
    options,
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
    prefix?: string;
    parser?: Parser<T>;
    options?: ParserOptions;
  } = {}): string {
    let children = this._children.map((n) =>
      n.render({ aliases, escape, prefix, parser, options })
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
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ComputeExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(name, node);
  }
}
