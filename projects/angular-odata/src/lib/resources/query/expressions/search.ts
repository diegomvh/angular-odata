import { Parser } from '../../../types';
import { Types } from '../../../utils';
import type { QueryCustomType } from '../builder';
import { Expression } from './base';
import { render, Grouping, Renderable, RenderableFactory } from './syntax';

export type SearchConnector = 'AND' | 'OR';

export class SearchTerm implements Renderable {
  constructor(protected value: string) {}

  get [Symbol.toStringTag]() {
    return 'SearchTerm';
  }

  toJson() {
    return {
      $type: Types.rawType(this),
      value: this.value,
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
    parser?: Parser<any>;
  }): string {
    return `${render(this.value, { aliases, escape, prefix, parser })}`;
  }

  clone() {
    return new SearchTerm(this.value);
  }
}

export type SearchExpressionBuilder<T> = {
  e: (connector?: SearchConnector) => SearchExpression<T>;
};
export class SearchExpression<T> extends Expression<T> {
  private _connector: SearchConnector;
  private _negated: boolean;
  constructor({
    children,
    connector,
    negated,
  }: {
    children?: Renderable[];
    connector?: SearchConnector;
    negated?: boolean;
  } = {}) {
    super({ children });
    this._connector = connector || 'AND';
    this._negated = negated || false;
  }

  get [Symbol.toStringTag]() {
    return 'SearchExpression';
  }

  static search<T>(
    opts: (
      builder: SearchExpressionBuilder<T>,
      current?: SearchExpression<T>,
    ) => SearchExpression<T>,
    current?: SearchExpression<T>,
  ): SearchExpression<T> {
    return opts(
      {
        e: (connector: SearchConnector = 'AND') =>
          new SearchExpression<T>({ connector }),
      },
      current,
    ) as SearchExpression<T>;
  }

  private _add(
    node: Renderable,
    connector?: SearchConnector,
  ): SearchExpression<T> {
    if (connector !== undefined && this._connector !== connector) {
      let children: Renderable[] = [];
      if (this._children.length > 0) {
        if (this._children.length === 1) {
          children = [...this._children];
        } else {
          let exp = new SearchExpression<T>({
            children: this._children,
            connector: this._connector,
            negated: this._negated,
          });
          if (exp.length() > 1) {
            children.push(new Grouping(exp));
          } else {
            children.push(exp);
          }
        }
      }
      if (
        node instanceof SearchExpression &&
        (node.connector() === connector || node.length() === 1)
      ) {
        children = [...children, ...node.children()];
      } else {
        children.push(new Grouping(node));
      }
      this._connector = connector;
      this._children = children;
    } else if (
      node instanceof SearchExpression &&
      !node.negated() &&
      (node.connector() === connector || node.length() === 1)
    ) {
      this._children = [...this._children, ...node.children()];
    } else {
      this._children.push(
        node instanceof SearchExpression && !node.negated()
          ? new Grouping(node)
          : node,
      );
    }
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
    parser?: Parser<T>;
  } = {}): string {
    let content = this._children
      .map((n) => n.render({ aliases, escape, prefix, parser }))
      .join(` ${this._connector} `);
    return content;
  }

  clone() {
    return new SearchExpression<T>({
      children: this._children.map((c) => c.clone()),
      connector: this._connector,
      negated: this._negated,
    });
  }

  override toJson() {
    const json = super.toJson();
    return Object.assign(json, { 
      connector: this._connector,
      negated: this._negated,
    });
  }

  static fromJson<T>(json: { [name: string]: any }): SearchExpression<T> {
    return new SearchExpression<T>({
      children: json['children'].map((c: any) => RenderableFactory(c)),
      connector: json['connector'],
      negated: json['negated'],
    });
  }
  connector() {
    return this._connector;
  }

  negated() {
    return this._negated;
  }

  or(exp: SearchExpression<T>): SearchExpression<T> {
    return this._add(exp, 'OR');
  }

  and(exp: SearchExpression<T>): SearchExpression<T> {
    return this._add(exp, 'AND');
  }

  not(exp: SearchExpression<T>): SearchExpression<T> {
    const notExp = new SearchExpression<T>({
      children: exp.children(),
      connector: exp.connector(),
      negated: true,
    });

    return this._add(notExp, this._connector);
  }

  term(value: any) {
    return this._add(new SearchTerm(value));
  }
}
