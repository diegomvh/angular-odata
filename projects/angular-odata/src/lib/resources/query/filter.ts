import { Expression } from './expressions';
import { functions } from './functions';
import { And, Or } from './operators';
import { Condition, Field } from './types';

export class FilterBuilder<T> {
  private _condition: typeof And | typeof Or = And;

  constructor(condition: Condition = Condition.AND) {
    this._condition = condition === Condition.AND ? And : Or;
  }

  private expr() {
    return new Expression<T>(this._condition);
  }

  static and<T>() {
    return new Expression<T>(And);
  }

  static or<T>() {
    return new Expression<T>(Or);
  }

  eq(left: Field<T> | string, right: any) {
    return this.expr().eq(left, right);
  }

  ne(left: Field<T> | string, right: any) {
    return this.expr().ne(left, right);
  }

  gt(left: Field<T> | string, right: any) {
    return this.expr().gt(left, right);
  }

  ge(left: Field<T> | string, right: any) {
    return this.expr().ge(left, right);
  }

  lt(left: Field<T> | string, right: any) {
    return this.expr().lt(left, right);
  }

  le(left: Field<T> | string, right: any) {
    return this.expr().le(left, right);
  }

  in(left: Field<T> | string, right: any[]) {
    return this.expr().in(left, right);
  }

  contains(left: Field<T> | string, right: any) {
    return functions.contains(left, right);
  }

  startsWith(left: Field<T> | string, right: any) {
    return functions.startsWith(left, right);
  }

  endsWith(left: Field<T> | string, right: any) {
    return functions.endsWith(left, right);
  }
}
