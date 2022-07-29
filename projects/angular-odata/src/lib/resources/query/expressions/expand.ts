import { QueryOptionNames } from '../../../types';
import { Objects, Types } from '../../../utils';
import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { FilterExpression, FilterExpressionBuilder } from './filter';
import { OrderByExpression, OrderByExpressionBuilder } from './orderby';
import { SearchExpression, SearchExpressionBuilder } from './search';
import { SelectExpression, SelectExpressionBuilder } from './select';
import { Field, render, Renderable } from './syntax';

export class ExpandField<T> implements Renderable {
  constructor(
    protected field: any,
    private values: { [name: string]: any } = {}
  ) {}

  get [Symbol.toStringTag]() {
    return 'ExpandField';
  }

  toJSON() {
    return {
      field: this.field.toJSON(),
    };
  }

  render({
    aliases,
    escape,
    prefix,
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
    prefix?: string;
  }): string {
    const params: { [key: string]: string } = [
      QueryOptionNames.select,
      QueryOptionNames.expand,
      QueryOptionNames.filter,
      QueryOptionNames.search,
      QueryOptionNames.orderBy,
      QueryOptionNames.skip,
      QueryOptionNames.top,
      QueryOptionNames.levels,
    ]
      .filter((key) => !Types.isEmpty(this.values[key]))
      .reduce((acc, key) => {
        let value: any = this.values[key];
        if (Types.rawType(value).endsWith('Expression')) {
          value = (value as Expression<T>).render({ aliases, prefix, escape });
        }
        return Object.assign(acc, { [key]: value });
      }, {});
    let expand = `${render(this.field, { aliases, escape, prefix })}`;
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
      {}
    );
    return new ExpandField(this.field.clone(), values);
  }

  select<T extends object>(
    opts: (
      builder: SelectExpressionBuilder<T>,
      current?: SelectExpression<T>
    ) => SelectExpression<T>
  ): SelectExpression<T> {
    return this.option(
      QueryOptionNames.select,
      SelectExpression.select<T>(opts, this.values[QueryOptionNames.select])
    );
  }

  expand<T extends object>(
    opts: (
      builder: ExpandExpressionBuilder<T>,
      current?: ExpandExpression<T>
    ) => ExpandExpression<T>
  ) {
    return this.option(
      QueryOptionNames.expand,
      ExpandExpression.expand<T>(opts, this.values[QueryOptionNames.expand])
    );
  }

  filter<T extends object>(
    opts: (
      builder: FilterExpressionBuilder<T>,
      current?: FilterExpression<T>
    ) => FilterExpression<T>
  ) {
    return this.option(
      QueryOptionNames.filter,
      FilterExpression.filter<T>(opts, this.values[QueryOptionNames.filter])
    );
  }

  search<T extends object>(
    opts: (builder: SearchExpressionBuilder<T>) => SearchExpression<T>
  ) {
    return this.option(
      QueryOptionNames.search,
      SearchExpression.search<T>(opts, this.values[QueryOptionNames.search])
    );
  }

  orderBy<T extends object>(
    opts: (
      builder: OrderByExpressionBuilder<T>,
      current?: OrderByExpression<T>
    ) => OrderByExpression<T>
  ) {
    return this.option(
      QueryOptionNames.orderBy,
      OrderByExpression.orderBy<T>(opts, this.values[QueryOptionNames.orderBy])
    );
  }

  skip(n: number) {
    return this.option<number>(QueryOptionNames.skip, n);
  }

  top(n: number) {
    return this.option<number>(QueryOptionNames.top, n);
  }

  levels(n: number | 'max') {
    return this.option<number | 'max'>(QueryOptionNames.levels, n);
  }

  // Option Handler
  private option<O>(name: QueryOptionNames, opts?: O) {
    if (opts !== undefined) this.values[name] = opts;
    return this.values[name];
  }
}

export type ExpandExpressionBuilder<T> = { t: T; e: () => ExpandExpression<T> };
export class ExpandExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static expression<T>() {
    return new ExpandExpression<T>();
  }

  static type<T extends object>(): T {
    return Field.factory<T>();
  }

  static expand<T extends object>(
    opts: (
      builder: ExpandExpressionBuilder<T>,
      current?: ExpandExpression<T>
    ) => ExpandExpression<T>,
    current?: ExpandExpression<T>
  ): ExpandExpression<T> {
    return opts(
      {
        t: ExpandExpression.type<T>(),
        e: ExpandExpression.expression,
      },
      current
    ) as ExpandExpression<T>;
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

  clone() {
    return new ExpandExpression({
      children: this._children.map((c) => c.clone()),
    });
  }

  private _add(node: Renderable): ExpandExpression<T> {
    this._children.push(node);
    return this;
  }

  field<F>(field: F, opts?: (e: ExpandField<F>) => void): ExpandExpression<F> {
    let node = new ExpandField<F>(field);
    if (opts !== undefined) opts(node);
    return this._add(node);
  }
}
