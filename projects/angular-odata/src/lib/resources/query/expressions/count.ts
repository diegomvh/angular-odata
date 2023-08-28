import { Parser, QueryOption } from '../../../types';
import { Objects, Types } from '../../../utils';
import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { FilterExpression, FilterExpressionBuilder } from './filter';
import { render, FieldFactory, Renderable } from './syntax';

export class CountField<T> implements Renderable {
  constructor(
    protected field: any,
    private values: { [name: string]: any } = {}
  ) {}

  get [Symbol.toStringTag]() {
    return 'CountField';
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
    parser,
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
    prefix?: string;
    parser?: Parser<T>
  }): string {
    const params: { [key: string]: string } = [
      QueryOption.filter,
      QueryOption.search,
    ]
      .filter((key) => !Types.isEmpty(this.values[key]))
      .reduce((acc, key) => {
        let value: any = this.values[key];
        if (Types.rawType(value).endsWith('Expression')) {
          value = (value as Expression<T>).render({ aliases, prefix, escape, parser });
        }
        return Object.assign(acc, { [key]: value });
      }, {});
    let count = `${render(this.field, { aliases, escape, prefix, parser })}/$count`;
    if (!Types.isEmpty(params)) {
      count = `${count}(${Object.keys(params)
        .map((key) => `$${key}=${params[key]}`)
        .join(';')})`;
    }
    return count;
  }

  filter(
    opts: (
      builder: FilterExpressionBuilder<T>,
      current?: FilterExpression<T>
    ) => FilterExpression<T>
  ) {
    return this.option(
      QueryOption.filter,
      FilterExpression.filter<T>(opts, this.values[QueryOption.filter])
    );
  }

  clone() {
    const values = Object.keys(this.values).reduce(
      (acc, key) =>
        Object.assign(acc, { [key]: Objects.clone(this.values[key]) }),
      {}
    );
    return new CountField<T>(this.field.clone(), values);
  }

  // Option Handler
  private option<O>(name: QueryOption, opts?: O) {
    if (opts !== undefined) this.values[name] = opts;
    return this.values[name];
  }
}

export type CountExpressionBuilder<T> = {
  t: Readonly<Required<T>>;
  e: () => CountExpression<T>;
};
export class CountExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static count<T>(
    opts: (
      builder: CountExpressionBuilder<T>,
      current?: CountExpression<T>
    ) => CountExpression<T>,
    current?: CountExpression<T>
  ): CountExpression<T> {
    return opts(
      {
        t: FieldFactory<Readonly<Required<T>>>(),
        e: () => new CountExpression<T>(),
      },
      current
    ) as CountExpression<T>;
  }

  private _add(node: Renderable): CountExpression<any> {
    this._children.push(node);
    return this;
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
    parser?: Parser<T>
  } = {}): string {
    let content = this._children
      .map((n) => n.render({ aliases, escape, prefix, parser }))
      .join(`,`);
    return content;
  }

  clone() {
    return new CountExpression<T>({
      children: this._children.map((c) => c.clone()),
    });
  }

  field<F>(
    field: F[],
    opts?: (e: { t: F; f: CountField<F> }) => CountExpression<F>
  ): CountExpression<F> {
    let countField = new CountField<F>(field);
    if (opts !== undefined)
      opts({
        t: FieldFactory<Readonly<Required<F>>>(),
        f: countField,
      });
    return this._add(countField);
  }
}
