import { ToString } from './types';
import { functions } from './functions';

export class Operator implements ToString {
  constructor(protected op: string, protected values: any[]) {}

  toString(): string {
    const values = this.values.map(handleValue);
    if (values.length === 2) {
      return `${values[0]} ${this.op} ${values[1]}`;
    }
    return `${this.op}(${values.join(', ')})`;
  }
}

export class Equals extends Operator {
  constructor(left: any, rigth: any) {
    super('eq', [left, rigth]);
  }
}

export class NotEquals extends Operator {
  constructor(left: any, rigth: any) {
    super('ne', [left, rigth]);
  }
}

export class GreaterThan extends Operator {
  constructor(left: any, rigth: any) {
    super('gt', [left, rigth]);
  }
}

export class GreaterThanOrEqual extends Operator {
  constructor(left: any, rigth: any) {
    super('ge', [left, rigth]);
  }
}

export class LessThan extends Operator {
  constructor(left: any, rigth: any) {
    super('lt', [left, rigth]);
  }
}

export class LessThanOrEqual extends Operator {
  constructor(left: any, rigth: any) {
    super('le', [left, rigth]);
  }
}

export class And extends Operator {
  constructor(left: any, rigth: any) {
    super('and', [left, rigth]);
  }
}

export class Or extends Operator {
  constructor(left: any, rigth: any) {
    super('or', [left, rigth]);
  }
}

export class Not extends Operator {
  constructor(protected value: any) {
    super('not', [value]);
  }
}

export class Has extends Operator {
  constructor(left: any, rigth: any) {
    super('has', [left, rigth]);
  }
}

export class In extends Operator {
  constructor(left: any, rigth: any) {
    super('in', [left, rigth]);
  }
}

export class Addition extends Operator {
  constructor(left: any, rigth: any) {
    super('add', [left, rigth]);
  }
}

export class Subtraction extends Operator {
  constructor(left: any, rigth: any) {
    super('sub', [left, rigth]);
  }
}

export class Negation extends Operator {
  constructor(value: any) {
    super('-', [value]);
  }
}

export class Multiplication extends Operator {
  constructor(left: any, rigth: any) {
    super('mul', [left, rigth]);
  }
}

export class Division extends Operator {
  constructor(left: any, rigth: any) {
    super('div', [left, rigth]);
  }
}

export class Modulo extends Operator {
  constructor(left: any, rigth: any) {
    super('mod', [left, rigth]);
  }
}

export class Grouping extends Operator {
  constructor(value: any) {
    super('', [value]);
  }
}

export const operators = {
  add: (left: any, rigth: any) => new Addition(left, rigth),
  sub: (left: any, rigth: any) => new Subtraction(left, rigth),
  mul: (left: any, rigth: any) => new Multiplication(left, rigth),
  div: (left: any, rigth: any) => new Division(left, rigth),
  mod: (left: any, rigth: any) => new Modulo(left, rigth),
  neg: (value: any) => new Negation(value),
  eq: (left: any, rigth: any) => new Equals(left, rigth),
  ne: (left: any, rigth: any) => new NotEquals(left, rigth),
  gt: (left: any, rigth: any) => new GreaterThan(left, rigth),
  ge: (left: any, rigth: any) => new GreaterThanOrEqual(left, rigth),
  lt: (left: any, rigth: any) => new LessThan(left, rigth),
  le: (left: any, rigth: any) => new LessThanOrEqual(left, rigth),
  and: (left: any, rigth: any) => new And(left, rigth),
  or: (left: any, rigth: any) => new Or(left, rigth),
  not: (value: any) => new Not(value),
  has: (left: any, rigth: any) => new Has(left, rigth),
  in: (left: any, rigth: any) => new In(left, rigth),
  group: (value: any) => new Grouping(value),
};
function handleValue(value: any) {
  return typeof value === 'function' ? value(functions) : value;
}
