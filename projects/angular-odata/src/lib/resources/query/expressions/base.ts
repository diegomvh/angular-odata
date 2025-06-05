import { Parser, ParserOptions } from '../../../types';
import { Types } from '../../../utils';
import { QueryCustomType } from '../builder';
import { Renderable } from './syntax';

export abstract class Expression<T> implements Renderable {
  protected _children: Renderable[];
  constructor({
    children,
  }: {
    children?: Renderable[];
  } = {}) {
    this._children = children || [];
  }

  get [Symbol.toStringTag]() {
    return 'Expression';
  }

  abstract render({
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
  }): string;

  abstract clone(): Expression<T>;

  children() {
    return [...this._children];
  }

  length() {
    return this._children.length;
  }

  toJson() {
    return {
      $type: Types.rawType(this),
      children: this._children.map((c) => c.toJson()),
    };
  }

  resolve(parser: any) {
    return parser;
  }
}
