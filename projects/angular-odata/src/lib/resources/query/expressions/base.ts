import type { QueryCustomType } from '../builder';
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
  }: {
    aliases?: QueryCustomType[] | undefined;
    escape?: boolean | undefined;
    prefix?: string | undefined;
  }): string;

  abstract clone(): Expression<T>;

  children() {
    return this._children;
  }

  length() {
    return this._children.length;
  }

  toJSON() {
    return {
      children: this._children.map((c) => c.toJSON()),
    };
  }
}
