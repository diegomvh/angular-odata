import { Utils } from '../utils/utils';

export type EntityKey = string | number | PlainObject;
export type PlainObject = { [property: string]: any };
export type Select = string | string[];
export type OrderBy = string | string[];
export type Filter = string | PlainObject | Array<string | PlainObject>;
export type NestedExpandOptions = { [key: string]: Partial<ExpandQueryOptions>; };
export type Expand = string | NestedExpandOptions | Array<string | NestedExpandOptions>;
export enum StandardAggregateMethods {
  sum = "sum",
  min = "min",
  max = "max",
  average = "average",
  countdistinct = "countdistinct",
}
export type Aggregate = { [propertyName: string]: { with: StandardAggregateMethods, as: string } } | string;

export interface ExpandQueryOptions {
  select: string | string[];
  filter: Filter;
  orderBy: string | string[];
  top: number;
  expand: Expand;
}
export interface Transform {
  aggregate?: Aggregate | Aggregate[];
  filter?: Filter;
  groupBy?: GroupBy;
}
export interface GroupBy {
  properties: string[];
  transform?: Transform;
}
export interface QueryOptions extends ExpandQueryOptions {
  search: string;
  transform: PlainObject | PlainObject[];
  skip: number;
  key: EntityKey; 
  action: string;
  func: string | { [functionName: string]: { [parameterName: string]: any } };
  format: string;
}

export enum Segments {
  batch = 'batch',
  metadata = 'metadata',
  entitySet = 'entitySet',
  singleton = 'singleton',
  typeName = 'typeName',
  property = 'property',
  navigationProperty = 'navigationProperty',
  ref = 'ref',
  value = 'value',
  count = 'count',
  functionCall = 'functionCall',
  actionCall = 'actionCall'
}

export enum Options {
  key = 'key',
  select = 'select',
  filter = 'filter',
  search = 'search',
  groupBy = 'groupBy',
  transform = 'transform',
  orderBy = 'orderBy',
  top = 'top',
  skip = 'skip',
  expand = 'expand',
  format = 'format',
  parameters = 'parameters',
  custom = 'custom'
}

export class OptionHandler<T> {
  constructor(private o: PlainObject, private t: Options) { }

  get name() {
    return this.t;
  }

  toJSON() {
    return this.o[this.t];
  }

  // Primitive value
  value() {
    return this.o[this.t];
  }

  // Array
  push(value: T) {
    if (!Utils.isArray(this.o[this.t]))
      this.o[this.t] = [this.o[this.t]];
    this.o[this.t].push(value);
  }

  remove(value: T) {
    if (Utils.isArray(this.o[this.t])) {
      this.o[this.t] = this.o[this.t].filter(v => v !== value);
      if (this.o[this.t].length === 1)
        this.o[this.t] = this.o[this.t][0];
    }
  }

  at(index: number) {
    if (Utils.isArray(this.o[this.t])) {
      return this.o[this.t][index];
    }
  }

  // Hash map
  private assertObject(): PlainObject {
    if (Utils.isObject(this.o[this.t]) && !Utils.isArray(this.o[this.t]))
      return this.o[this.t];
    else if (!Utils.isUndefined(this.o[this.t]) && !Array.isArray(this.o[this.t])) {
      this.o[this.t] = [this.o[this.t]];
      let obj = this.o[this.t].find(v => Utils.isObject(v));
      if (!obj) {
        obj = {};
        this.o[this.t].push(obj);
      }
      return obj;
    }
    return (this.o[this.t] = {});
  }

  set(name: string, value: T) {
    this.assertObject()[name] = value;
  }

  get(name: string): T {
    if (!Array.isArray(this.o[this.t])) {
      return this.o[this.t][name];
    }
  }

  unset(name: string) {
    delete this.assertObject()[name];
    this.o[this.t] = this.o[this.t].filter(v => !Utils.isEmpty(v));
    if (this.o[this.t].length === 1)
      this.o[this.t] = this.o[this.t][0];
  }

  has(name: string) {
    return !!this.get(name);
  }

  assign(values: PlainObject) {
    Object.assign(this.assertObject(), values);
  }

  clear() {
    delete this.o[this.t];
  }
}

export interface ODataSegment {
  type: string;
  name: string;
  options: PlainObject;
}

export class SegmentHandler {
  options?: PlainObject
  constructor(private segment: ODataSegment) {
    this.options = this.segment.options;
  }

  get name() {
    return this.segment.name;
  }

  get type() {
    return this.segment.type;
  }

  // Option Handler
  option<T>(type: Options, opts?: T) {
    if (!Utils.isUndefined(opts))
      this.options[type] = opts;
    return new OptionHandler<T>(this.options, type);
  }
}

export enum RequestMethod {
  Get,
  Post,
  Put,
  Delete,
  Options,
  Head,
  Patch
}
