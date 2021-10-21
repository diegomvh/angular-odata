import { ToString, None, Field } from './types';
import { And, Operator, operators, Or } from './operators';
import { functions } from './functions';

export class Expression<T> {
  private _condition: typeof And | typeof Or = And;
  private _root: ToString = new None();
  constructor(root?: ToString, condition?: typeof And | typeof Or) {
    if (root) {
      this._root = root;
    }
    if (condition) {
      this._condition = condition;
    }
  }

  toString() {
    return this._root.toString();
  }

  private _add(op: ToString): Expression<T> {
    this._root = new this._condition(this._root, op);
    return this;
  }

  or(exp: ToString) {
    return new Expression<T>(
      operators.or(this._root, operators.group(exp)),
      Or
    );
  }

  and(exp: ToString) {
    return new Expression<T>(
      operators.and(this._root, operators.group(exp)),
      And
    );
  }

  add(left: Field<T> | string, rigth: any) {
    return this._add(operators.add(left, rigth));
  }

  sub(left: Field<T> | string, rigth: any) {
    return this._add(operators.sub(left, rigth));
  }

  mul(left: Field<T> | string, rigth: any) {
    return this._add(operators.mul(left, rigth));
  }

  div(left: Field<T> | string, rigth: any) {
    return this._add(operators.div(left, rigth));
  }

  mod(left: Field<T> | string, rigth: any) {
    return this._add(operators.mod(left, rigth));
  }

  neg(exp: Expression<T>) {
    return this._add(operators.neg(exp));
  }

  eq(left: Field<T> | string, rigth: any) {
    return this._add(operators.eq(left, rigth));
  }

  ne(left: Field<T> | string, rigth: any) {
    return this._add(operators.ne(left, rigth));
  }

  gt(left: Field<T> | string, rigth: any) {
    return this._add(operators.gt(left, rigth));
  }

  ge(left: Field<T> | string, rigth: any) {
    return this._add(operators.ge(left, rigth));
  }

  lt(left: Field<T> | string, rigth: any) {
    return this._add(operators.lt(left, rigth));
  }

  le(left: Field<T> | string, rigth: any) {
    return this._add(operators.le(left, rigth));
  }

  in(left: Field<T> | string, rigth: any) {
    return this._add(operators.in(left, rigth));
  }

  endsWith(left: Field<T> | string, rigth: any) {
    return this._add(functions.endsWith(left, rigth));
  }
}
