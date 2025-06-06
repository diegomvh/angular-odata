import { Parser, ParserOptions, QueryOption } from '../../../types';
import { Objects, Types } from '../../../utils';
import { QueryCustomType, Unpacked } from '../builder';
import { Expression } from './base';
import { ComputeExpression, ComputeExpressionBuilder } from './compute';
import { FilterExpression, FilterExpressionBuilder } from './filter';
import { OrderByExpression, OrderByExpressionBuilder } from './orderby';
import { SearchExpression, SearchExpressionBuilder } from './search';
import { SelectExpression, SelectExpressionBuilder } from './select';
import {
  FieldFactory,
  render,
  Renderable,
  RenderableFactory,
  resolve,
} from './syntax';

export class ExpandField<T> implements Renderable {
  constructor(
    protected field: any,
    private values: { [name: string]: any } = {},
  ) {}

  get [Symbol.toStringTag]() {
    return 'ExpandField';
  }

  toJson() {
    return {
      field: this.field.toJson(),
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
    parser?: Parser<T>;
    options?: ParserOptions;
  }): string {
    parser = resolve([this.field], parser);
    const params: { [name: string]: string } = [
      QueryOption.select,
      QueryOption.expand,
      QueryOption.filter,
      QueryOption.search,
      QueryOption.orderBy,
      QueryOption.compute,
      QueryOption.skip,
      QueryOption.top,
      QueryOption.count,
      QueryOption.levels,
    ]
      .filter((key) => !Types.isEmpty(this.values[key]))
      .reduce((acc, key) => {
        let value: any = this.values[key];
        if (Types.rawType(value).endsWith('Expression')) {
          value = (value as Expression<T>).render({
            aliases,
            prefix,
            escape,
            parser,
            options,
          });
        }
        return Object.assign(acc, { [key]: value });
      }, {});
    let expand = `${render(this.field, {
      aliases,
      escape,
      prefix,
      parser,
      options,
    })}`;
    if (!Types.isEmpty(params)) {
      expand = `${expand}(${Object.keys(params)
        .map((key) => `$${key}=${params[key]}`)
        .join(';')})`;
    }
    return expand;
  }

  clone() {
    const values = Object.keys(this.values).reduce(
      (acc, key) =>
        Object.assign(acc, { [key]: Objects.clone(this.values[key]) }),
      {},
    );
    return new ExpandField<T>(
      typeof this.field === 'string' ? this.field : this.field.clone(),
      values,
    );
  }

  resolve(parser: any) {
    return parser;
  }

  select(
    opts: (
      builder: SelectExpressionBuilder<T>,
      current?: SelectExpression<T>,
    ) => SelectExpression<T>,
  ): SelectExpression<T> {
    return this.option(
      QueryOption.select,
      SelectExpression.factory<T>(opts, this.values[QueryOption.select]),
    );
  }

  expand(
    opts: (
      builder: ExpandExpressionBuilder<T>,
      current?: ExpandExpression<T>,
    ) => ExpandExpression<T>,
  ) {
    return this.option(
      QueryOption.expand,
      ExpandExpression.factory<T>(opts, this.values[QueryOption.expand]),
    );
  }

  filter(
    opts: (
      builder: FilterExpressionBuilder<T>,
      current?: FilterExpression<T>,
    ) => FilterExpression<T>,
  ) {
    return this.option(
      QueryOption.filter,
      FilterExpression.factory<T>(opts, this.values[QueryOption.filter]),
    );
  }

  search(opts: (builder: SearchExpressionBuilder<T>) => SearchExpression<T>) {
    return this.option(
      QueryOption.search,
      SearchExpression.factory<T>(opts, this.values[QueryOption.search]),
    );
  }

  orderBy(
    opts: (
      builder: OrderByExpressionBuilder<T>,
      current: OrderByExpression<T>,
    ) => OrderByExpression<T>,
  ) {
    return this.option(
      QueryOption.orderBy,
      OrderByExpression.factory<T>(opts, this.values[QueryOption.orderBy]),
    );
  }

  compute(
    opts: (
      builder: ComputeExpressionBuilder<T>,
      current: ComputeExpression<T>,
    ) => ComputeExpression<T>,
  ) {
    return this.option(
      QueryOption.compute,
      ComputeExpression.factory<T>(opts, this.values[QueryOption.compute]),
    );
  }

  skip(n: number) {
    return this.option<number>(QueryOption.skip, n);
  }

  top(n: number) {
    return this.option<number>(QueryOption.top, n);
  }

  levels(n: number | 'max') {
    return this.option<number | 'max'>(QueryOption.levels, n);
  }

  count() {
    return this.option<boolean>(QueryOption.count, true);
  }

  // Option Handler
  private option<O>(name: QueryOption, opts?: O) {
    if (opts !== undefined) this.values[name] = opts;
    return this.values[name] as O;
  }
}

export type ExpandExpressionBuilder<T> = {
  t: Required<T>;
  e: () => ExpandExpression<T>;
};
export class ExpandExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  override get [Symbol.toStringTag]() {
    return 'ExpandExpression';
  }

  static factory<T>(
    opts: (
      builder: ExpandExpressionBuilder<T>,
      current: ExpandExpression<T>,
    ) => ExpandExpression<T>,
    current?: ExpandExpression<T>,
  ): ExpandExpression<T> {
    return opts(
      {
        t: FieldFactory<Required<T>>(),
        e: () => new ExpandExpression<T>(),
      },
      current ?? new ExpandExpression<T>(),
    ) as ExpandExpression<T>;
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, {});
  }

  static fromJson<T>(json: { [name: string]: any }): ExpandExpression<T> {
    return new ExpandExpression<T>({
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
    return new ExpandExpression<T>({
      children: this._children.map((c) => c.clone()),
    });
  }

  private _add(node: Renderable): ExpandExpression<T> {
    this._children.push(node);
    return this;
  }

  field<F>(
    field: F,
    opts?: (e: ExpandField<Unpacked<F>>) => void,
  ): ExpandExpression<T> {
    let node = new ExpandField<Unpacked<F>>(field);
    if (opts !== undefined) opts(node);
    return this._add(node);
  }

  combine(expression: ExpandExpression<T>): ExpandExpression<T> {
    return this._add(expression);
  }
}
