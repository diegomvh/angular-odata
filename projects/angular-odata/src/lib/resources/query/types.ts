import { Functions, Function } from './functions';

export enum Condition {
  AND = 'and',
  OR = 'or',
}

export interface ToString {
  toString(): string;
}

export class None implements ToString {
  toString() {
    return '';
  }
}

export type func<T> = (x: Functions<T>) => Function<T>;
export type Field<T> = keyof T | func<keyof T>;
