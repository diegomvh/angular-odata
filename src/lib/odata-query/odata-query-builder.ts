import { ODataQueryBase } from "./odata-query-base";
import { ODataService } from "../odata-service/odata.service";
import buildQuery from 'odata-query';
import { Utils } from '../utils/utils';

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

export class ParamHandler<T> {
  constructor(private o: PlainObject, private t: string) { }
  get name() {
    return this.t;
  }
  toJSON() {
    return this.o[this.t];
  }

  add(value: T) {
    if (!Array.isArray(this.o[this.t]))
      this.o[this.t] = [this.o[this.t]];
    this.o[this.t].push(value);
  }

  remove(value: T) {
    if (Array.isArray(this.o[this.t])) {
      this.o[this.t] = this.o[this.t].filter(v => v !== value);
      if (this.o[this.t].length === 1)
        this.o[this.t] = this.o[this.t][0];
    }
  }

  at(index: number) {
    if (Array.isArray(this.o[this.t])) {
      return this.o[this.t][index];
    }
  }

  get(name: string): T {
    if (!Array.isArray(this.o[this.t])) {
      return this.o[this.t][name];
    }
  }
  
  private assertObject(): PlainObject {
    if (typeof(this.o[this.t]) === 'object' && !Array.isArray(this.o[this.t]))
      return this.o[this.t];
    else if (!Array.isArray(this.o[this.t]))
      this.o[this.t] = [this.o[this.t]];
    let obj = this.o[this.t].find(v => typeof(v) === 'object');
    if (!obj) {
      obj = {};
      this.o[this.t].push(obj);
    }
    return obj;
  }

  set(name: string, value: T) {
    this.assertObject()[name] = value;
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
}

export class SegmentHandler {
  constructor(private segment: Segment) {}
  get name() {
    return this.segment.name;
  }
  get type() {
    return this.segment.type;
  }
  params() {
    return new ParamHandler<string | number | PlainObject>(this.segment as PlainObject, "params");
  }
}

export class ODataQueryBuilder extends ODataQueryBase {
  segments: Segment[];
  params: PlainObject;

  constructor(
    service: ODataService,
    segments?: Segment[],
    params?: PlainObject
  ) {
    super(service);
    this.segments = segments || [];
    this.params = params || {};
  }

  clone() {
    return new ODataQueryBuilder(this.service,
      this.segments.map(segment =>
        ({ type: segment.type, name: segment.name, params: Object.assign({}, segment.params) })),
      Object.assign({}, this.params));
  };

  toJSON() {
    return {
      segments: [...this.segments.map(segment => 
        ({ type: segment.type, name: segment.name, params: Object.assign({}, segment.params) }))],
      params: Object.assign({}, this.params)
    }
  }

  static fromJSON(
    service: ODataService, 
    json: {segments?: Segment[], params?: PlainObject}
  ) {
    return new ODataQueryBuilder(service, json.segments || [], json.params || {});
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
      .map(key => !Utils.isEmpty(this.params[key]) ? { [key]: this.params[key] } : {})
      .reduce((acc, obj) => Object.assign(acc, obj), {});
    let query = buildQuery(odata);
    return segments.join(ODataQueryBase.PATHSEP) + query;
  }

  // Params
  protected wrapParam<T>(type: string, opts?: T | T[]) {
    if (Utils.isUndefined(this.params[type]))
      this.params[type] = {};
    if (!Utils.isUndefined(opts))
      this.params[type] = opts;
    return new ParamHandler<T>(this.params, type);
  }

  protected wrapValue<T>(type: string, opts?: T) {
    if (Utils.isUndefined(opts))
      return this.params[type];
    this.params[type] = opts;
  }

  protected hasParam(type) {
    return !Utils.isUndefined(this.params[type]);
  }
  protected removeParam(type) {
    delete this.params[type];
  }

  // Segments
  protected findSegment(type: string, name?: string) {
    return this.segments.find(s => 
      s.type === type && 
      (Utils.isUndefined(name) || s.name === name));
  }

  protected wrapSegment(type: string, name?: string) {
    let segment = this.findSegment(type, name);
    if (!segment && !Utils.isUndefined(name)) {
      segment = { type, name, params: {} } as Segment;
      this.segments.push(segment);
    }
    return new SegmentHandler(segment);
  }

  protected hasSegment(type: string, name?: string) {
    return !!this.findSegment(type, name);
  }

  protected removeSegment(type: string, name?: string) {
    let segment = this.findSegment(type, name);
    this.segments = this.segments.filter(s => s !== segment);
  }

  protected lastSegment(): SegmentHandler {
    if (this.segments.length > 0)
      return new SegmentHandler(this.segments[this.segments.length - 1]);
  }

  protected is(type: string) {
    return this.lastSegment().type === type;
  }

  select(opts?: string | string[]) {
    return this.wrapParam<string>(ODataQueryBuilder.SELECT, typeof (opts) === 'string' ? [opts] : opts);
  }
  hasSelect() {
    return this.hasParam(ODataQueryBuilder.SELECT);
  }
  removeSelect() {
    this.removeParam(ODataQueryBuilder.SELECT);
  }
  search(opts?: string) {
    return this.wrapValue<string>(ODataQueryBuilder.SEARCH, opts);
  }
  hasSearch() {
    return this.hasParam(ODataQueryBuilder.SEARCH);
  }
  removeSearch() {
    this.removeParam(ODataQueryBuilder.SEARCH);
  }
  filter(opts?: Filter): ParamHandler<Filter> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapParam<Filter>(ODataQueryBuilder.FILTER, opts);
  }
  removeFilter() {
    this.removeParam(ODataQueryBuilder.FILTER);
  }
  groupBy(opts?: GroupBy) {
    return this.wrapParam(ODataQueryBuilder.GROUP_BY, opts);
  }
  removeGroupBy() {
    this.removeParam(ODataQueryBuilder.GROUP_BY);
  }
  transform(opts?: Transform) {
    return this.wrapParam(ODataQueryBuilder.TRANSFORM, opts);
  }
  removeTransform() {
    this.removeParam(ODataQueryBuilder.TRANSFORM);
  }
  orderBy(opts?: string | string[]) {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapParam<string>(ODataQueryBuilder.ORDER_BY, opts);
  }
  removeOrderBy() { this.removeParam(ODataQueryBuilder.ORDER_BY); }
  expand(opts?: Expand): ParamHandler<Expand> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapParam<Expand>(ODataQueryBuilder.EXPAND, opts);
  }
  hasExpand() {
    return this.hasParam(ODataQueryBuilder.EXPAND);
  }
  removeExpand() {
    this.removeParam(ODataQueryBuilder.EXPAND);
  }
  format(opts?: string) {
    return this.wrapValue<string>(ODataQueryBuilder.FORMAT, opts);
  }
  removeFormat() {
    this.removeParam(ODataQueryBuilder.FORMAT);
  }

  top(opts?: number) {
    return this.wrapValue<number>(ODataQueryBuilder.TOP, opts);
  }
  removeTop() {
    this.removeParam(ODataQueryBuilder.TOP);
  }
  skip(opts?: number) {
    return this.wrapValue<number>(ODataQueryBuilder.SKIP, opts);
  }
  removeSkip() {
    this.removeParam(ODataQueryBuilder.SKIP);
  }
  count(opts?: boolean | Filter) {
    return this.wrapParam(ODataQueryBuilder.COUNT, opts);
  }
  removeCount() {
    this.removeParam(ODataQueryBuilder.COUNT);
  }
  entityKey(opts?: string | number | PlainObject) {
    if (this.isEntitySet() || this.isNavigationProperty()) {
      let segment = this.lastSegment();
      if (Utils.isUndefined(opts)) return segment.params().get("key");
      this.removeFilter();
      this.removeOrderBy();
      this.removeCount();
      this.removeSkip();
      this.removeTop();
      segment.params().set("key", opts);
    }
  }
  removeEntityKey() {
    let segment = this.lastSegment();
    if (segment)
      segment.params().unset("key");
  }
  hasEntityKey() {
    let segment = this.lastSegment();
    return (segment && segment.params().has("key"));
  }
  singleton(name: string) {
    return this.wrapSegment(ODataQueryBuilder.SINGLETON, name);
  }
  removeSingleton(name: string) {
    return this.removeSegment(ODataQueryBuilder.SINGLETON, name);
  }
  isSingleton() {
    return this.is(ODataQueryBuilder.SINGLETON);
  }
  entitySet(name: string) {
    return this.wrapSegment(ODataQueryBuilder.ENTITY_SET, name);
  }
  removeEntitySet(name: string) {
    return this.removeSegment(ODataQueryBuilder.ENTITY_SET, name);
  }
  isEntitySet() {
    return this.is(ODataQueryBuilder.ENTITY_SET);
  }
  action(name: string) {
    return this.wrapSegment(ODataQueryBuilder.ACTION_CALL, name);
  }
  isAction() {
    return this.is(ODataQueryBuilder.ACTION_CALL);
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
  isFunction() {
    return this.is(ODataQueryBuilder.FUNCTION_CALL);
  }
  property(name: string) {
    return this.wrapSegment(ODataQueryBuilder.PROPERTY, name);
  }
  removeProperty(name: string) {
    return this.removeSegment(ODataQueryBuilder.PROPERTY, name);
  }
  isProperty() {
    return this.is(ODataQueryBuilder.PROPERTY);
  }
  navigationProperty(name: string) {
    this.removeSelect();
    this.removeExpand();
    return this.wrapSegment(ODataQueryBuilder.NAVIGATION_PROPERTY, name);
  }
  removeNavigationProperty(name: string) {
    return this.removeSegment(ODataQueryBuilder.NAVIGATION_PROPERTY, name);
  }
  isNavigationProperty() {
    return this.is(ODataQueryBuilder.NAVIGATION_PROPERTY);
  }
  ref() {
    return this.wrapSegment(ODataQueryBuilder.REF, ODataQueryBuilder.$REF);
  }
  removeRef() {
    return this.removeSegment(ODataQueryBuilder.REF, ODataQueryBuilder.$REF);
  }
  isRef() {
    return this.is(ODataQueryBuilder.REF);
  }
  value() {
    return this.wrapSegment(ODataQueryBuilder.VALUE, ODataQueryBuilder.$VALUE);
  }
  removeValue() {
    return this.removeSegment(ODataQueryBuilder.VALUE, ODataQueryBuilder.$VALUE);
  }
  isValue() {
    return this.is(ODataQueryBuilder.VALUE);
  }
  countSegment() {
    return this.wrapSegment(ODataQueryBuilder.COUNT, ODataQueryBuilder.$COUNT);
  }
  removeCountSegment() {
    return this.removeSegment(ODataQueryBuilder.COUNT, ODataQueryBuilder.$COUNT);
  }
}