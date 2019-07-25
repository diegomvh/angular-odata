import { ODataQueryBase } from "./odata-query-base";
import { ODataService } from "../odata-service/odata.service";
import buildQuery from 'odata-query';

export type PlainObject = { [property: string]: any };
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
  key: string | number | PlainObject;
  count: boolean | Filter;
  action: string;
  func: string | { [functionName: string]: { [parameterName: string]: any } };
  format: string;
}

export interface Segment {
  type: string;
  name: string;
  params: PlainObject;
}

export class ObjectHandler<T> {
  constructor(private options: PlainObject, private type: string) { }
  toJSON(): T {
    return this.options[this.type];
  }
  get(name: string): T {
    return this.options[this.type][name];
  }
  set(name: string, value: T) {
    return this.options[this.type][name] = value;
  }
  unset(name: string) {
    delete this.options[this.type][name];
  }
  assign(values: T) {
    Object.assign(this.options[this.type], values);
  }
}

export class ArrayHandler<T> {
  constructor(private options: PlainObject, private type: string) { }
  push(value: T) {
    this.options[this.type].push(value);
  }
}

export class ValueHandler<T> {
  constructor(private options: PlainObject, private type: string) { }
  get(): T {
    return this.options[this.type];
  }
  set(value: T) {
    return this.options[this.type] = value;
  }
}

export class SegmentHandler {
  constructor(private segment: Segment) { }
  getName() {
    return this.segment.name;
  }
  setName(name: string) {
    this.segment.name = name;
  }
  params() {
    return new ObjectHandler<string | number | PlainObject>(this.segment, "params");
  }
}

export class ODataQueryBuilder extends ODataQueryBase {
  segments: Segment[];
  options: PlainObject;

  constructor(
    service: ODataService,
    segments?: Segment[],
    options?: PlainObject
  ) {
    super(service);
    this.segments = segments || [];
    this.options = options || {};
  }

  clone() {
    return new ODataQueryBuilder(this.service,
      this.segments.map(segment =>
        ({ type: segment.type, name: segment.name, params: Object.assign({}, segment.params) })),
      Object.assign({}, this.options));
  };

  toJSON() {
    return {
      segments: this.segments.slice(), options: Object.assign({}, this.options)
    }
  }

  static fromJSON(service: ODataService, json) {
    let builder = new ODataQueryBuilder(service, json.options);
    builder.segments = json.segments || [];
    return builder;
  }

  protected toString() {
    let segments = this.segments
      .map(segment => {
        if (segment.type == ODataQueryBuilder.FUNCTION_CALL)
          return buildQuery({ func: { [segment.name]: segment.params } }).slice(1);
        return segment.name + buildQuery(segment.params);
      });
    let odata = [
      ODataQueryBuilder.SELECT,
      ODataQueryBuilder.FILTER,
      ODataQueryBuilder.SEARCH,
      ODataQueryBuilder.GROUP_BY,
      ODataQueryBuilder.TRANSFORM,
      ODataQueryBuilder.ORDER_BY,
      ODataQueryBuilder.TOP,
      ODataQueryBuilder.SKIP,
      ODataQueryBuilder.COUNT,
      ODataQueryBuilder.EXPAND,
      ODataQueryBuilder.FORMAT]
      .map(key => this.options[key] ? { [key]: this.options[key] } : {})
      .reduce((acc, obj) => Object.assign(acc, obj), {});
    let query = buildQuery(odata);
    return segments.join(ODataQueryBuilder.PATHSEP) + query;
  }

  protected paramsHandler(params) {
    return {
      toJSON: function () {
        return params;
      },
      get: function (name) {
        return params[name];
      },
      set: function (name, value) {
        return params[name] = value;
      },
      unset: function (name) {
        delete params[name];
      },
      assign: function (values) {
        Object.assign(params, values);
      }
    };
  }

  // Object
  protected wrapObject<T>(type: string, opts?: T) {
    if (typeof (opts) === "undefined")
      this.options[type] = {};
    return new ObjectHandler<T>(this.options, type);
  }

  protected wrapArray<T>(type: string, opts?: T[]) {
    if (typeof (opts) === "undefined")
      this.options[type] = [];
    return new ArrayHandler<T>(this.options, type);
  }

  protected wrapValue<T>(type: string, opts?: T) {
    if (typeof (opts) === "undefined")
      this.options[type] = null;
    return new ValueHandler<T>(this.options, type);
  }

  protected hasOption(type) {
    return typeof (this.options[type]) !== "undefined";
  }

  protected removeOption(type) {
    delete this.options[type];
  }

  // Segments
  protected wrapSegment(type: string, name?: string, index: number = -1) {
    let segment: Segment;
    if (typeof (name) === "undefined") {
      segment = this.segments.find(s => s.type === type);
      if (segment)
        return new SegmentHandler(segment);
    } else {
      segment = this.segments.find(s => s.type === type && s.name === name);
      if (!segment) {
        segment = { type, name, params: {} } as Segment;
        if (index === -1)
          this.segments.push(segment);
        else {
          this.segments.splice(index, 0, segment);
        }
      }
      return new SegmentHandler(segment);
    }
  }
  protected hasSegment(type, name) {
    return !!this.segments.find(s => s.type === type && (typeof (name) === "undefined" || s.name === name));
  }
  protected removeSegment(type, name) {
    this.segments = this.segments.filter(s => s.type === type && s.name === name);
  }

  select(opts?: string | string[]) {
    return this.wrapArray<string>(ODataQueryBuilder.SELECT, typeof (opts) === 'string' ? [opts] : opts);
  }
  hasSelect() {
    return this.hasOption(ODataQueryBuilder.SELECT);
  }
  removeSelect() {
    this.removeOption(ODataQueryBuilder.SELECT);
  }
  search(opts?: string) {
    return this.wrapValue<string>(ODataQueryBuilder.SEARCH, opts);
  }
  hasSearch() {
    return this.hasOption(ODataQueryBuilder.SEARCH);
  }
  removeSearch() {
    this.removeOption(ODataQueryBuilder.SEARCH);
  }
  filter(opts?: Filter): ArrayHandler<string | PlainObject> | ObjectHandler<PlainObject> {
    if (typeof (opts) === 'undefined') {
      let current = this.options[ODataQueryBuilder.FILTER];
      return (Array.isArray(current) || typeof (current) === 'undefined') ?
        this.wrapArray<(string | PlainObject)[]>(ODataQueryBuilder.FILTER, current || []) :
        this.wrapObject<PlainObject>(ODataQueryBuilder.FILTER, current || {});
    } else {
      opts = typeof (opts) === 'string' ? [opts] : opts;
      return Array.isArray(opts) ?
        this.wrapArray<string | PlainObject>(ODataQueryBuilder.FILTER, opts) :
        this.wrapObject<PlainObject>(ODataQueryBuilder.FILTER, opts);
    }
  }
  removeFilter() {
    this.removeOption(ODataQueryBuilder.FILTER);
  }
  groupBy(opts?: GroupBy) {
    return this.wrapObject(ODataQueryBuilder.GROUP_BY, opts);
  }
  removeGroupBy() {
    this.removeOption(ODataQueryBuilder.GROUP_BY);
  }
  transform(opts?: Transform) {
    return this.wrapObject(ODataQueryBuilder.TRANSFORM, opts);
  }
  removeTransform() {
    this.removeOption(ODataQueryBuilder.TRANSFORM);
  }
  orderBy(opts?: string | string[]) {
    return this.wrapArray<string>(ODataQueryBuilder.ORDER_BY, (opts && Array.isArray(opts)) ? opts : []);
  }
  removeOrderBy() { this.removeOption(ODataQueryBuilder.ORDER_BY); }
  expand(opts?: Expand): ArrayHandler<string | NestedExpandOptions> | ObjectHandler<NestedExpandOptions> {
    if (typeof (opts) === 'undefined') {
      let current = this.options[ODataQueryBuilder.EXPAND];
      return (Array.isArray(current) || typeof (current) === 'undefined') ?
        this.wrapArray<Expand>(ODataQueryBuilder.EXPAND, current || []) :
        this.wrapObject<NestedExpandOptions>(ODataQueryBuilder.EXPAND, current || {});
    } else {
      opts = typeof (opts) === 'string' ? [opts] : opts;
      return Array.isArray(opts) ?
        this.wrapArray<string | NestedExpandOptions>(ODataQueryBuilder.EXPAND, opts) :
        this.wrapObject<NestedExpandOptions>(ODataQueryBuilder.EXPAND, opts);
    }
  }
  hasExpand() {
    return this.hasOption(ODataQueryBuilder.EXPAND);
  }
  removeExpand() {
    this.removeOption(ODataQueryBuilder.EXPAND);
  }
  format(opts?: string) {
    return this.wrapValue<string>(ODataQueryBuilder.FORMAT, opts);
  }
  removeFormat() {
    this.removeOption(ODataQueryBuilder.FORMAT);
  }

  top(opts?: number) {
    return this.wrapValue<number>(ODataQueryBuilder.TOP, opts);
  }
  removeTop() {
    this.removeOption(ODataQueryBuilder.TOP);
  }
  skip(opts?: number) {
    return this.wrapValue<number>(ODataQueryBuilder.SKIP, opts);
  }
  removeSkip() {
    this.removeOption(ODataQueryBuilder.SKIP);
  }
  count(opts?: boolean | Filter) {
    return this.wrapObject(ODataQueryBuilder.COUNT, opts);
  }
  removeCount() {
    this.removeOption(ODataQueryBuilder.COUNT);
  }

  entityKey(opts: string | number | PlainObject) {
    let name = this.wrapSegment(ODataQueryBuilder.ENTITY_SET).getName();
    // Quito lo que no se puede usar con keys
    this.removeFilter();
    this.removeOrderBy();
    this.removeCount();
    this.removeSkip();
    this.removeTop();
    this.wrapSegment(ODataQueryBuilder.ENTITY_SET, name || "").params().set('key', opts);
    return this;
  }
  removeEntityKey() {
    let name = this.wrapSegment(ODataQueryBuilder.ENTITY_SET).getName();
    if (typeof (name) !== "undefined")
      this.wrapSegment(ODataQueryBuilder.ENTITY_SET, name).params().unset('key');
  }

  singleton(name: string) {
    return this.wrapSegment(ODataQueryBuilder.SINGLETON, name);
  }
  removeSingleton(name: string) {
    return this.removeSegment(ODataQueryBuilder.SINGLETON, name);
  }
  entitySet(name: string) {
    return this.wrapSegment(ODataQueryBuilder.ENTITY_SET, name, 0);
  }
  removeEntitySet(name: string) {
    return this.removeSegment(ODataQueryBuilder.ENTITY_SET, name);
  }
  action(name: string) {
    return this.wrapSegment(ODataQueryBuilder.ACTION_CALL, name);
  }
  hasAction(name: string) {
    return this.hasSegment(ODataQueryBuilder.ACTION_CALL, name);
  }
  removeAction(name: string) {
    return this.removeSegment(ODataQueryBuilder.ACTION_CALL, name);
  }
  function(name: string) {
    return this.wrapSegment(ODataQueryBuilder.FUNCTION_CALL, name);
  }
  removeFunction(name: string) {
    return this.removeSegment(ODataQueryBuilder.FUNCTION_CALL, name);
  }
  property(name: string) {
    return this.wrapSegment(ODataQueryBuilder.PROPERTY, name);
  }
  removeProperty(name: string) {
    return this.removeSegment(ODataQueryBuilder.PROPERTY, name);
  }
  navigationProperty(name: string) {
    return this.wrapSegment(ODataQueryBuilder.NAVIGATION_PROPERTY, name);
  }
  removeNavigationProperty(name: string) {
    return this.removeSegment(ODataQueryBuilder.NAVIGATION_PROPERTY, name);
  }
  ref() {
    return this.wrapSegment(ODataQueryBuilder.REF, ODataQueryBuilder.$REF);
  }
  removeRef() {
    return this.removeSegment(ODataQueryBuilder.REF, ODataQueryBuilder.$REF);
  }
  value() {
    return this.wrapSegment(ODataQueryBuilder.VALUE, ODataQueryBuilder.$VALUE);
  }
  removeValue() {
    return this.removeSegment(ODataQueryBuilder.VALUE, ODataQueryBuilder.$VALUE);
  }
  countSegment() {
    return this.wrapSegment(ODataQueryBuilder.COUNT, ODataQueryBuilder.$COUNT);
  }
  removeCountSegment() {
    return this.removeSegment(ODataQueryBuilder.COUNT, ODataQueryBuilder.$COUNT);
  }
}