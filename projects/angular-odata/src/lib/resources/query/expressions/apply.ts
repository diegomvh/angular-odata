import { Parser, ParserOptions } from '../../../types';
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

export type ApplyExpressionBuilder<T> = {
  t: Required<Readonly<T>>;
  e: () => ApplyExpression<T>;
};
export class ApplyExpression<T> extends Expression<T> {
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
    return 'ApplyExpression';
  }

  static factory<T>(
    opts: (
      builder: ApplyExpressionBuilder<T>,
      current?: ApplyExpression<T>
    ) => ApplyExpression<T>,
    current?: ApplyExpression<T>
  ): ApplyExpression<T> {
    return opts(
      {
        t: FieldFactory<Readonly<Required<T>>>(),
        e: () => new ApplyExpression<T>(),
      },
      current
    ) as ApplyExpression<T>;
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, {
      names: this.names,
    });
  }

  static fromJson<T>(json: { [name: string]: any }): ApplyExpression<T> {
    return new ApplyExpression<T>({
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
    return new ApplyExpression<T>({
      children: this._children.map((c) => c.clone()),
      names: [...this.names],
    });
  }

  private _add(node: Renderable): ApplyExpression<any> {
    this._children.push(node);
    return this;
  }

  aggregate(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //topcount
  topCount(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //topsum
  topSum(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //toppercent
  topPercent(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //bottomcount
  bottomCount(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //bottomsum
  bottomSum(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //bottompercent
  bottomPercent(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  identity(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  concat(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //groupby
  groupBy(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //filter
  filter(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //expand
  expand(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //search
  search(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }

  //compute
  compute(
    opts: (e: { o: ODataOperators<T>; f: ODataFunctions<T> }) => Renderable
  ): ApplyExpression<T> {
    const node = opts({
      o: operators as ODataOperators<T>,
      f: functions as ODataFunctions<T>,
    });
    return this._add(node);
  }
}
