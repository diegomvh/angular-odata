import { Parser, ParserOptions } from '../../../types';
import { Types } from '../../../utils';
import { QueryCustomType } from '../builder';
import { Expression } from './base';
import { render, FieldFactory, Renderable, RenderableFactory } from './syntax';

export type OrderAttribute = 'asc' | 'desc';
export class OrderByField implements Renderable {
  constructor(
    protected field: Renderable,
    protected order: OrderAttribute,
  ) {}

  get [Symbol.toStringTag]() {
    return 'OrderByField';
  }

  toJson() {
    return {
      $type: Types.rawType(this),
      field: this.field.toJson(),
      order: this.order,
    };
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
    parser?: Parser<any>;
    options?: ParserOptions;
  }): string {
    return `${render(this.field, {
      aliases,
      escape,
      prefix,
      parser,
      options,
    })} ${this.order}`;
  }

  clone() {
    return new OrderByField(
      typeof this.field !== 'string' ? this.field.clone() : this.field,
      this.order,
    );
  }
  resolve(parser: any) {
    return parser;
  }
}

export type OrderByExpressionBuilder<T> = {
  t: Required<T>;
  e: () => OrderByExpression<T>;
};

export class OrderByExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  override get [Symbol.toStringTag]() {
    return 'OrderByExpression';
  }

  static factory<T>(
    opts: (
      builder: OrderByExpressionBuilder<T>,
      current?: OrderByExpression<T>,
    ) => OrderByExpression<T>,
    current?: OrderByExpression<T>,
  ): OrderByExpression<T> {
    return opts(
      {
        t: FieldFactory<Required<T>>(),
        e: () => new OrderByExpression<T>(),
      },
      current,
    ) as OrderByExpression<T>;
  }

  private _add(node: Renderable): OrderByExpression<T> {
    this._children.push(node);
    return this;
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, {});
  }

  static fromJson<T>(json: { [name: string]: any }): OrderByExpression<T> {
    return new OrderByExpression<T>({
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
    let content = this._children
      .map((n) => n.render({ aliases, escape, prefix, parser, options }))
      .join(`,`);
    return content;
  }

  clone() {
    return new OrderByExpression<T>({
      children: this._children.map((c) => c.clone()),
    });
  }

  ascending(field: any) {
    return this._add(new OrderByField(field, 'asc'));
  }

  descending(field: any) {
    return this._add(new OrderByField(field, 'desc'));
  }
}
