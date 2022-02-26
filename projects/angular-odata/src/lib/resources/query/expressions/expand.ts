import { QueryOptionNames } from '../../../types';
import { Types } from '../../../utils';
import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { FilterConnector, FilterExpression } from './filter';
import { OrderByExpression } from './orderby';
import { SearchConnector, SearchExpression } from './search';
import { SelectExpression } from './select';
import {
  Field,
  ODataFunctions,
  ODataOperators,
  render,
  Renderable,
} from './syntax';

export class ExpandField<T> implements Renderable {
  values: { [name: string]: any } = {};

  constructor(protected field: any) {}

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
        let value = this.values[key];
        if (Types.rawType(value) === 'Expression') {
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
    return new ExpandField(this.field.clone());
  }

  select<T extends object>(
    opts: (
      builder: { s: T; e: () => SelectExpression<T> },
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
      builder: { s: T; e: () => ExpandExpression<T> },
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
      builder: {
        s: T;
        e: (connector?: FilterConnector) => FilterExpression<T>;
        o: ODataOperators<T>;
        f: ODataFunctions<T>;
      },
      current?: FilterExpression<T>
    ) => FilterExpression<T>
  ) {
    return this.option(
      QueryOptionNames.filter,
      FilterExpression.filter<T>(opts, this.values[QueryOptionNames.filter])
    );
  }

  search<T extends object>(
    opts: (builder: {
      e: (connector?: SearchConnector) => SearchExpression<T>;
    }) => SearchExpression<T>
  ) {
    return this.option(
      QueryOptionNames.search,
      SearchExpression.search<T>(opts, this.values[QueryOptionNames.search])
    );
  }

  orderBy<T extends object>(
    opts: (
      builder: { s: T; e: () => OrderByExpression<T> },
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

export class ExpandExpression<T> extends Expression<T> {
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    super({ children });
  }

  static e<T>() {
    return new ExpandExpression<T>();
  }

  static s<T extends object>(): T {
    return Field.factory<T>();
  }

  static expand<T extends object>(
    opts: (
      builder: { s: T; e: () => ExpandExpression<T> },
      current?: ExpandExpression<T>
    ) => ExpandExpression<T>,
    current?: ExpandExpression<T>
  ): ExpandExpression<T> {
    return opts(
      {
        s: ExpandExpression.s<T>(),
        e: ExpandExpression.e,
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
