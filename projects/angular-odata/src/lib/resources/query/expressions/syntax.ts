import { Parser } from '../../../types';
import { Objects, Types } from '../../../utils';
import type { QueryCustomType } from '../builder';
import { normalizeValue } from '../builder';

export type Normalize = 'all' | 'right' | 'left' | 'none';

export interface Renderable {
  render({
    aliases,
    escape,
    prefix,
    parser
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
    prefix?: string;
    parser?: Parser<any>
  }): string;
  toString(): string;
  toJSON(): any;
  clone(): any;
}

export const FieldFactory = <T extends object>(names: string[] = []): any =>
  new Proxy({ _names: names } as T, {
    get(target: T, key: string | symbol) {
      let names = (target as any)['_names'];
      if (key === 'render') {
        return ({ prefix }: { prefix?: string }) =>
          prefix ? `${prefix}/${names.join('/')}` : names.join('/');
      } else if (key === 'clone') {
        return () => FieldFactory([...names]);
      } else if (key === 'isField') {
        return () => true;
      } else if (key === 'toJSON') {
        return () => ({
          $type: 'Field',
          names: names,
        });
      } else if (key === 'resolve') {
        return (parser: any) => names.reduce((acc: any, name: string) => acc.field(name), parser);
      } else {
        return FieldFactory([...names, key]);
      }
    },

    has(target: T, key: string): any {
      return ['toJSON', 'isField', 'clone', 'render', 'resolve'].includes(key) || key in target;
    }
  })

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

export function render(
  value: any,
  {
    aliases,
    normalize,
    escape,
    prefix,
    parser,
  }: {
    aliases?: QueryCustomType[];
    normalize?: boolean;
    escape?: boolean;
    prefix?: string;
    parser?: Parser<any>;
  } = {}
): string | number | boolean | null {
  if (Types.isFunction(value)) {
    return render(value(syntax), { aliases, normalize, prefix, parser });
  }
  if (
    Types.isObject(value) &&
    'render' in value
  ) {
    return render(value.render({ aliases, escape, prefix, parser }), {
      aliases,
      normalize,
      escape,
      prefix,
      parser
    });
  }
  return normalize ? normalizeValue(value, { aliases, escape }) : value;
}

export function resolve(values: any, parser?: Parser<any>) {
  if (parser !== undefined) {
    let fields = values.filter((v: any) => Types.isObject(v) && 'isField' in v && v.isField()); 
    if (fields.length === 1 && Types.isObject(parser) && 'field' in parser) {
      return fields[0].resolve(parser);
    }
  }
  return parser;
}

export function encode(values: any, parser?: Parser<any>) {
  if (parser !== undefined) {
    return values.map((v: any) => (Types.isObject(v) || v === null) ? v: parser?.encode(v)); 
  }
  return values;
}

export class Function<T> implements Renderable {
  constructor(
    protected name: string,
    protected values: any[],
    protected normalize: Normalize,
    protected escape: boolean = false
  ) { }

  get [Symbol.toStringTag]() {
    return 'Function';
  }

  toJSON() {
    return {
      $type: Types.rawType(this),
      name: this.name,
      values: this.values.map((v) => Types.isObject(v) && 'toJSON' in v ? v.toJSON() : v),
      normalize: this.normalize,
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
    parser?: Parser<T>
  }): string {
    parser = resolve(this.values, parser);
    let [left, ...values] = encode(this.values, parser);

    left = render(left, { aliases, escape, prefix, parser, normalize: this.normalize === 'all' || this.normalize === 'left' });
    const params = [
      left,
      ...values.map((v: any) =>
        render(v, { aliases, escape, prefix, parser, normalize: this.normalize === 'all' || this.normalize === 'right' })
      ),
    ];
    return `${this.name}(${params.join(', ')})`;
  }

  clone() {
    return new Function<T>(
      this.name,
      this.values.map((v) => Objects.clone(v)),
      this.normalize,
      this.escape
    );
  }
}

export class StringAndCollectionFunctions<T> {
  concat(left: any, right: any, normalize: Normalize = 'right') {
    return new Function<T>('concat', [left, right], normalize);
  }

  contains(left: any, right: any, normalize: Normalize = 'right') {
    return new Function<T>('contains', [left, right], normalize);
  }

  endsWith(left: any, right: any, normalize: Normalize = 'right') {
    return new Function<T>('endswith', [left, right], normalize);
  }

  indexOf(left: any, right: any, normalize: Normalize = 'right') {
    return new Function<T>('indexof', [left, right], normalize);
  }

  length(left: any, normalize: Normalize = 'right') {
    return new Function<T>('length', [left], normalize);
  }

  startsWith(left: any, right: any, normalize: Normalize = 'right') {
    return new Function<T>('startswith', [left, right], normalize);
  }

  subString(left: any, right: number, length?: number, normalize: Normalize = 'none') {
    let values = [left, right];
    if (length !== undefined) {
      values.push(length);
    }
    return new Function<T>('substring', values, normalize);
  }
}

export class CollectionFunctions<T> {
  hasSubset(left: T, right: any, normalize: Normalize = 'none') {
    return new Function<T>('hassubset', [left, right], normalize);
  }
  hasSubsequence(left: T, right: any, normalize: Normalize = 'none') {
    return new Function<T>('hassubsequence', [left, right], normalize);
  }
}

export class StringFunctions<T> {
  matchesPattern(left: any | string, pattern: string, normalize: Normalize = 'none') {
    return new Function<T>('matchesPattern', [left, pattern], normalize);
  }
  toLower(left: any, normalize: Normalize = 'none') {
    return new Function<T>('tolower', [left], normalize);
  }
  toUpper(left: any, normalize: Normalize = 'none') {
    return new Function<T>('toupper', [left], normalize);
  }
  trim(left: any, normalize: Normalize = 'none') {
    return new Function<T>('trim', [left], normalize);
  }
}

export class DateAndTimeFunctions<T> {
  date(left: any, normalize: Normalize = 'none') {
    return new Function<T>('date', [left], normalize);
  }
  day(left: any, normalize: Normalize = 'none') {
    return new Function<T>('day', [left], normalize);
  }
  fractionalseconds(left: any, normalize: Normalize = 'none') {
    return new Function<T>('fractionalseconds', [left], normalize);
  }
  hour(left: any, normalize: Normalize = 'none') {
    return new Function<T>('hour', [left], normalize);
  }
  maxdatetime(left: any, normalize: Normalize = 'none') {
    return new Function<T>('maxdatetime', [left], normalize);
  }
  mindatetime(left: any, normalize: Normalize = 'none') {
    return new Function<T>('mindatetime', [left], normalize);
  }
  minute(left: any, normalize: Normalize = 'none') {
    return new Function<T>('minute', [left], normalize);
  }
  month(left: any, normalize: Normalize = 'none') {
    return new Function<T>('month', [left], normalize);
  }
  now() {
    return new Function<T>('now', [], 'none');
  }
  second(left: any, normalize: Normalize = 'none') {
    return new Function<T>('second', [left], normalize);
  }
  time(left: any, normalize: Normalize = 'none') {
    return new Function<T>('time', [left], normalize);
  }
  totaloffsetminutes(left: any, normalize: Normalize = 'none') {
    return new Function<T>('totaloffsetminutes', [left], normalize);
  }
  totalseconds(left: any, normalize: Normalize = 'none') {
    return new Function<T>('totalseconds', [left], normalize);
  }
  year(left: any, normalize: Normalize = 'none') {
    return new Function<T>('year', [left], normalize);
  }
}

export class ArithmeticFunctions<T> {
  ceiling(left: T | string, normalize: Normalize = 'none') {
    return new Function<T>('ceiling', [left], normalize);
  }
  floor(left: T | string, normalize: Normalize = 'none') {
    return new Function<T>('floor', [left], normalize);
  }
  round(left: T | string, normalize: Normalize = 'none') {
    return new Function<T>('round', [left], normalize);
  }
}

export class TypeFunctions<T> {
  cast(left: T | string, right?: string, normalize: Normalize = 'right') {
    return new Function<T>('cast', [left, right], normalize);
  }

  isof(left: T | string, right?: string, normalize: Normalize = 'right') {
    return new Function<T>('isof', [left, right], normalize);
  }
}

export class GeoFunctions<T> {
  geoDistance(left: T, right: string, normalize: Normalize = 'right') {
    return new Function<T>('geo.distance', [left, right], normalize);
  }
  geoIntersects(left: T, right: string, normalize: Normalize = 'right') {
    return new Function<T>('geo.intersects', [left, right], normalize);
  }
  geoLength(left: T, normalize: Normalize = 'none') {
    return new Function<T>('geo.length', [left], normalize);
  }
}

export class ConditionalFunctions<T> {
  case(left: T | string, right: any, normalize: Normalize = 'none') {
    return new Function<T>('case', [left, right], normalize);
  }
}

export class Operator<T> implements Renderable {
  constructor(
    protected op: string,
    protected values: any[],
    protected normalize: Normalize
  ) { }

  get [Symbol.toStringTag]() {
    return 'Operator';
  }

  toJSON() {
    return {
      $type: Types.rawType(this),
      op: this.op,
      values: this.values.map((v) => Types.isObject(v) && 'toJSON' in v ? v.toJSON() : v),
      normalize: this.normalize,
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
    parser?: Parser<T>
  }): string {
    parser = resolve(this.values, parser);
    let [left, right] = encode(this.values, parser);

    left = render(left, { aliases, escape, prefix, parser, normalize: this.normalize === 'all' || this.normalize === 'left' });
    if (right !== undefined) {
      right = Array.isArray(right)
        ? `(${right
          .map((v) =>
            render(v, {
              aliases,
              escape,
              prefix,
              parser,
              normalize: this.normalize === 'all' || this.normalize === 'right',
            })
          )
          .join(',')})`
        : render(right, {
          aliases,
          escape,
          prefix,
          parser,
          normalize: this.normalize === 'all' || this.normalize === 'right',
        });
      return `${left} ${this.op} ${right}`;
    }
    return `${this.op}(${left})`;
  }

  clone() {
    return new Operator(
      this.op,
      this.values.map((v) => Objects.clone(v)),
      this.normalize
    );
  }
}

export class LogicalOperators<T> {
  eq(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('eq', [left, right], normalize);
  }
  ne(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('ne', [left, right], normalize);
  }
  gt(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('gt', [left, right], normalize);
  }
  ge(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('ge', [left, right], normalize);
  }
  lt(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('lt', [left, right], normalize);
  }
  le(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('le', [left, right], normalize);
  }
  /*
  and(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('and', [left, right], normalize);
  }
  or(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('or', [left, right], normalize);
  }
  */
  not(left: any, normalize: Normalize = 'none') {
    return new Operator<T>('not', [left], normalize);
  }
  has(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('has', [left, right], normalize);
  }
  in(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('in', [left, right], normalize);
  }
}

export class ArithmeticOperators<T> {
  add(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator<T>('add', [left, right], normalize);
  }
  sub(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('sub', [left, right], normalize);
  }
  mul(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('mul', [left, right], normalize);
  }
  div(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('div', [left, right], normalize);
  }
  mod(left: any, right: any, normalize: Normalize = 'right') {
    return new Operator('mod', [left, right], normalize);
  }
  neg(value: any, normalize: Normalize = 'right') {
    return new Operator('-', [value], normalize);
  }
}

export class Grouping<T> implements Renderable {
  constructor(protected group: Renderable) { }

  get [Symbol.toStringTag]() {
    return 'Grouping';
  }

  toJSON() {
    return {
      $type: Types.rawType(this),
      group: this.group.toJSON(),
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
    parser?: Parser<T>;
  }): string {
    return `(${render(this.group, { aliases, escape, prefix, parser })})`;
  }

  clone() {
    return new Grouping(Objects.clone(this.group));
  }
}

export class Lambda<T> implements Renderable {
  constructor(
    protected op: string,
    protected values: any[],
    protected alias?: string
  ) { }

  get [Symbol.toStringTag]() {
    return 'Lambda';
  }

  toJSON() {
    return {
      $type: Types.rawType(this),
      op: this.op,
      values: this.values.map((v) => Types.isObject(v) && 'toJSON' in v ? v.toJSON() : v),
      alias: this.alias,
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
    parser?: Parser<T>
  }): string {
    parser = resolve(this.values, parser);
    let [left, right] = encode(this.values, parser);

    left = render(left, { aliases, escape, prefix, parser });
    if (right) {
      let alias = this.alias || left.split('/').pop().toLowerCase()[0];
      return `${left}/${this.op}(${alias}:${render(right, {
        aliases,
        escape,
        prefix: alias,
        parser,
      })})`;
    } else {
      return `${left}/${this.op}()`;
    }
  }

  clone() {
    return new Lambda(
      this.op,
      this.values.map((v) => Objects.clone(v)),
      this.alias
    );
  }
}

export class LambdaOperators<T> {
  any(left: T, right: any, alias?: string) {
    return new Lambda('any', [left, right], alias);
  }

  all(left: T, right: any, alias?: string) {
    return new Lambda('all', [left, right], alias);
  }
}

export class ODataOperators<T> { }
export interface ODataOperators<T>
  extends LogicalOperators<T>,
  ArithmeticOperators<T>,
  LambdaOperators<T> { }

applyMixins(ODataOperators, [
  LogicalOperators,
  ArithmeticOperators,
  LambdaOperators,
]);
export const operators: ODataOperators<any> = new ODataOperators<any>();

export class ODataFunctions<T> { }
export interface ODataFunctions<T>
  extends StringAndCollectionFunctions<T>,
  CollectionFunctions<T>,
  StringFunctions<T>,
  DateAndTimeFunctions<T>,
  ArithmeticFunctions<T>,
  TypeFunctions<T>,
  GeoFunctions<T>,
  ConditionalFunctions<T> { }

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

export class ODataSyntax<T> { }
export interface ODataSyntax<T> extends ODataOperators<T>, ODataFunctions<T> { }
applyMixins(ODataSyntax, [ODataOperators, ODataFunctions]);

export const syntax: ODataSyntax<any> = new ODataSyntax<any>();
