import { ToString } from './types';

export class Function<T> implements ToString {
  constructor(protected functionName: string, protected values: any[]) {}

  toString(): string {
    const values = this.values.map(handleValue);
    return `${this.functionName}(${values.join(', ')})`;
  }
}

export class Concat<T> extends Function<T> {
  constructor(s1: any, s2: any) {
    super('concat', [s1, s2]);
  }
}

export class Contains<T> extends Function<T> {
  constructor(s1: any, s2: any) {
    super('contains', [s1, s2]);
  }
}

export class EndsWith<T> extends Function<T> {
  constructor(s1: any, s2: any) {
    super('endswith', [s1, s2]);
  }
}

export class IndexOf<T> extends Function<T> {
  constructor(s1: any, s2: any) {
    super('indexof', [s1, s2]);
  }
}

export class Length<T> extends Function<T> {
  constructor(value: any) {
    super('length', [value]);
  }
}

export class StartsWith<T> extends Function<T> {
  constructor(s1: any, s2: any) {
    super('startswith', [s1, s2]);
  }
}

export class SubString<T> extends Function<T> {
  constructor(value: any, start: any, length?: any) {
    super('substring', [value, start, length]);
  }
}

export class HasSubset<T> extends Function<T> {
  constructor(s1: any, s2: any) {
    super('substring', [s1, s2]);
  }
}

export class HasSubsequence<T> extends Function<T> {
  constructor(s1: any, s2: any) {
    super('substring', [s1, s2]);
  }
}

// String functions
export class MatchesPattern<T> extends Function<T> {
  constructor(value: T | string, pattern: string) {
    super('matchesPattern', [value, pattern]);
  }
}

export class ToLower<T> extends Function<T> {
  constructor(value: T | string) {
    super('tolower', [value]);
  }
}

export class ToUpper<T> extends Function<T> {
  constructor(value: T | string) {
    super('toupper', [value]);
  }
}

export class Trim<T> extends Function<T> {
  constructor(value: T | string) {
    super('trim', [value]);
  }
}

function handleValue(value: any) {
  return value;
}

export class Functions<T> {
  concat(s1: T, s2: T | string) {
    return new Concat<T>(s1, s2);
  }
  contains(s1: T, s2: T) {
    return new Contains<T>(s1, s2);
  }
  endsWith(s1: T, s2: any) {
    return new EndsWith<T>(s1, s2);
  }
  indexOf(s1: T, s2: any) {
    return new IndexOf<T>(s1, s2);
  }
  length(value: T) {
    return new Length<T>(value);
  }
  startsWith(s1: T, s2: any) {
    return new StartsWith<T>(s1, s2);
  }
  subString(value: T, start: any, length?: any) {
    return new SubString<T>(value, start, length);
  }
  hasSubset(s1: T, s2: any) {
    return new HasSubset<T>(s1, s2);
  }
  hasSubsequence(s1: T, s2: any) {
    return new HasSubsequence<T>(s1, s2);
  }
  matchesPattern(value: T, pattern: string) {
    return new MatchesPattern<T>(value, pattern);
  }
  toLower(value: T) {
    return new ToLower<T>(value);
  }
  toUpper(value: T | string) {
    return new ToUpper<T>(value);
  }
  trim(value: T) {
    return new Trim<T>(value);
  }
}

export const functions = new Functions<any>();
