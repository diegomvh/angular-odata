import { handleValue } from './builder';
import { Node } from './types';

function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
          Object.create(null)
      );
    });
  });
}

export class Function<T> implements Node {
  constructor(protected name: string, protected values: any[]) {}

  toString(): string {
    var [field, ...values] = this.values;

    if (typeof field === 'function') {
      values = [field(syntax), ...values.map((v) => handleValue(v))];
    } else {
      values = [field, ...values.map((v) => handleValue(v))];
    }
    return `${this.name}(${values.join(', ')})`;
  }
}

export class StringAndCollectionFunctions<T> {
  concat(s1: T | string, s2: any) {
    return new Function<T>('concat', [s1, s2]);
  }
  contains(s1: T | string, s2: any) {
    return new Function<T>('contains', [s1, s2]);
  }
  endsWith(s1: T | string, s2: any) {
    return new Function<T>('endswith', [s1, s2]);
  }
  indexOf(s1: T | string, s2: any) {
    return new Function<T>('indexof', [s1, s2]);
  }
  length(value: T | string) {
    return new Function<T>('length', [value]);
  }
  startsWith(s1: T | string, s2: any) {
    return new Function<T>('startswith', [s1, s2]);
  }
  subString(value: T | string, start: any, length?: any) {
    return new Function<T>('substring', [value, start, length]);
  }
}

export class CollectionFunctions<T> {
  hasSubset(s1: T | string, s2: any) {
    return new Function<T>('hassubset', [s1, s2]);
  }
  hasSubsequence(s1: T | string, s2: any) {
    return new Function<T>('hassubsequence', [s1, s2]);
  }
}

export class StringFunctions<T> {
  matchesPattern(value: T | string, pattern: string) {
    return new Function<T>('matchesPattern', [value, pattern]);
  }
  toLower(value: T) {
    return new Function<T>('tolower', [value]);
  }
  toUpper(value: T) {
    return new Function<T>('toupper', [value]);
  }
  trim(value: T) {
    return new Function<T>('trim', [value]);
  }
}

export class DateAndTimeFunctions<T> {
  date(value: T) {
    return new Function<T>('date', [value]);
  }
  day(value: T) {
    return new Function<T>('day', [value]);
  }
  fractionalseconds(value: T) {
    return new Function<T>('fractionalseconds', [value]);
  }
  hour(value: T) {
    return new Function<T>('hour', [value]);
  }
  maxdatetime(value: T) {
    return new Function<T>('maxdatetime', [value]);
  }
  mindatetime(value: T) {
    return new Function<T>('mindatetime', [value]);
  }
  minute(value: T) {
    return new Function<T>('minute', [value]);
  }
  month(value: T) {
    return new Function<T>('month', [value]);
  }
  now() {
    return new Function<T>('now', []);
  }
  second(value: T) {
    return new Function<T>('second', [value]);
  }
  time(value: T) {
    return new Function<T>('time', [value]);
  }
  totaloffsetminutes(value: T) {
    return new Function<T>('totaloffsetminutes', [value]);
  }
  totalseconds(value: T) {
    return new Function<T>('totalseconds', [value]);
  }
  year(value: T) {
    return new Function<T>('year', [value]);
  }
}

export class ArithmeticFunctions<T> {
  ceiling(value: T | string) {
    return new Function<T>('ceiling', [value]);
  }
  floor(value: T | string) {
    return new Function<T>('floor', [value]);
  }
  round(value: T | string) {
    return new Function<T>('round', [value]);
  }
}

export class TypeFunctions<T> {
  cast(value: T | string, type: string) {
    return new Function<T>('cast', [value, type]);
  }
  isof(value: T | string, type: string) {
    return new Function<T>('isof', [value, type]);
  }
}

export class GeoFunctions<T> {
  distance(value: T | string, point: string) {
    return new Function<T>('distance', [value, point]);
  }
  intersects(value: T | string, polygon: string) {
    return new Function<T>('intersects', [value, polygon]);
  }
  length(value: T | string) {
    return new Function<T>('length', [value]);
  }
}

export class ConditionalFunctions<T> {
  case(condition: T | string, value: any) {
    return new Function<T>('case', [condition, value]);
  }
}

export class Operator<T> implements Node {
  constructor(protected op: string | null, protected values: any[]) {}

  toString(): string {
    let [left, right] = this.values;

    if (typeof left === 'function') {
      left = left(syntax);
    } else if (typeof left === 'object' && 'toString' in left) {
      left = left.toString();
    }
    if (this.op === null) return `(${left})`;
    if (typeof right === 'function') {
      right = right(syntax);
    } else if (typeof right === 'object' && 'toString' in right) {
      right = right.toString();
    } else if (right) {
      right = handleValue(right);
    }
    if (right) {
      return `${left} ${this.op} ${right}`;
    }
    return `${this.op}(${left})`;
  }
}

export class LogicalOperators<T> {
  eq(left: any, right: any) {
    return new Operator('eq', [left, right]);
  }
  ne(left: any, right: any) {
    return new Operator('ne', [left, right]);
  }
  gt(left: any, right: any) {
    return new Operator('gt', [left, right]);
  }
  ge(left: any, right: any) {
    return new Operator('ge', [left, right]);
  }
  lt(left: any, right: any) {
    return new Operator('lt', [left, right]);
  }
  le(left: any, right: any) {
    return new Operator('le', [left, right]);
  }
  and(left: any, right: any) {
    return new Operator('and', [left, right]);
  }
  or(left: any, right: any) {
    return new Operator('or', [left, right]);
  }
  not(value: any) {
    return new Operator<T>('not', [value]);
  }
  has(left: any, right: any) {
    return new Operator('has', [left, right]);
  }
  in(left: any, right: any) {
    return new Operator('in', [left, right]);
  }
}

export class ArithmeticOperators<T> {
  add(left: any, right: any) {
    return new Operator<T>('add', [left, right]);
  }
  sub(left: any, right: any) {
    return new Operator('sub', [left, right]);
  }
  mul(left: any, right: any) {
    return new Operator('mul', [left, right]);
  }
  div(left: any, right: any) {
    return new Operator('div', [left, right]);
  }
  mod(left: any, right: any) {
    return new Operator('mod', [left, right]);
  }
  neg(value: any) {
    return new Operator('-', [value]);
  }
}

export class Grouping<T> implements Node {
  constructor(protected group: any) {}

  toString(): string {
    let group = this.group;

    if (typeof group === 'function') {
      group = group(syntax);
    } else if (typeof group === 'object' && 'toString' in group) {
      group = group.toString();
    }
    return `(${group})`;
  }
}

export class LambdaOperators<T> {
  any(value: any) {
    return new Operator('any', [value]);
  }

  all(value: any) {
    return new Operator('all', [value]);
  }
}

export class ODataOperators<T> {}
export interface ODataOperators<T>
  extends LogicalOperators<T>,
    ArithmeticOperators<T>,
    LambdaOperators<T> {}

applyMixins(ODataOperators, [
  LogicalOperators,
  ArithmeticOperators,
  LambdaOperators,
]);
export const operators: ODataOperators<any> = new ODataOperators<any>();

export class ODataFunctions<T> {}
export interface ODataFunctions<T>
  extends StringAndCollectionFunctions<T>,
    CollectionFunctions<T>,
    StringFunctions<T>,
    DateAndTimeFunctions<T>,
    ArithmeticFunctions<T>,
    TypeFunctions<T>,
    GeoFunctions<T>,
    ConditionalFunctions<T> {}

applyMixins(ODataFunctions, [
  StringAndCollectionFunctions,
  CollectionFunctions,
  StringFunctions,
  DateAndTimeFunctions,
  ArithmeticFunctions,
  TypeFunctions,
  GeoFunctions,
  ConditionalFunctions,
]);
export const functions: ODataFunctions<any> = new ODataFunctions<any>();

export class ODataSyntax<T> {}
export interface ODataSyntax<T> extends ODataOperators<T>, ODataFunctions<T> {}
applyMixins(ODataSyntax, [ODataOperators, ODataFunctions]);

export const syntax: ODataSyntax<any> = new ODataSyntax<any>();
