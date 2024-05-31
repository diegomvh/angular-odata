import { Parser, ParserOptions } from '../../../types';
import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { FieldFactory, Renderable, RenderableFactory } from './syntax';

export type SelectExpressionBuilder<T> = {
  t: Required<T>;
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

  static factory<T>(
    opts: (
      builder: SelectExpressionBuilder<T>,
      current?: SelectExpression<T>
    ) => SelectExpression<T>,
    current?: SelectExpression<T>
  ): SelectExpression<T> {
    return opts(
      {
        t: FieldFactory<Required<T>>(),
        e: () => new SelectExpression<T>(),
      },
      current
    ) as SelectExpression<T>;
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, {});
  }

  static fromJson<T>(json: { [name: string]: any }): SelectExpression<T> {
    return new SelectExpression<T>({
      children: json['children'].map((c: any) => RenderableFactory(c)),
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
    return this._children
      .map((n) => n.render({ aliases, escape, prefix, parser, options }))
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

  fields(...fields: any[]): SelectExpression<T> {
    fields.forEach((f) => this._add(f));
    return this;
  }
}
