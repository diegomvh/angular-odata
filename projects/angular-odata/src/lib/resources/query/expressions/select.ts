import { Parser } from '../../../types';
import { Types } from '../../../utils';
import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { FieldFactory, Renderable } from './syntax';

export type SelectExpressionBuilder<T> = {
  t: Readonly<Required<T>>;
  e: () => SelectExpression<T>;
};
export class SelectExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  get [Symbol.toStringTag]() {
    return 'SelectExpression';
  }

  static select<T>(
    opts: (
      builder: SelectExpressionBuilder<T>,
      current?: SelectExpression<T>,
    ) => SelectExpression<T>,
    current?: SelectExpression<T>,
  ): SelectExpression<T> {
    return opts(
      {
        t: FieldFactory<Readonly<Required<T>>>(),
        e: () => new SelectExpression<T>(),
      },
      current,
    ) as SelectExpression<T>;
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, { });
  }

  static fromJson<T>(json: { [name: string]: any }): SelectExpression<T> {
    console.log("select", json);
    return new SelectExpression<T>({
      children: json['children'],
    });
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
    return this._children
      .map((n) => n.render({ aliases, escape, prefix, parser }))
      .join(',');
  }

  clone() {
    return new SelectExpression<T>({
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
