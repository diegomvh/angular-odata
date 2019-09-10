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
  options: PlainObject;
}

export class OptionHandler<T> {
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
  options() {
    return new OptionHandler<string | number | PlainObject>(this.segment as PlainObject, "options");
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
        ({ type: segment.type, name: segment.name, options: Object.assign({}, segment.options) })),
      Object.assign({}, this.options));
  };

  toJSON() {
    return {
      segments: [...this.segments.map(segment => 
        ({ type: segment.type, name: segment.name, params: Object.assign({}, segment.options) }))],
      params: Object.assign({}, this.options)
    }
  }

  static fromJSON(
    service: ODataService, 
    json: {segments?: Segment[], params?: PlainObject}
  ) {
    return new ODataQueryBuilder(service, json.segments || [], json.params || {});
  }

  path(): string {
    let segments = this.segments
      .map(segment => {
        if (segment.type == ODataQueryBuilder.FUNCTION_CALL)
          return buildQuery({ func: { [segment.name]: segment.options } }).slice(1);
        return segment.name + buildQuery(segment.options);
      });
    return segments.join(ODataQueryBase.PATHSEP);
  }

  params(): PlainObject {
    return [
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
      .filter(key => !Utils.isEmpty(this.options[key]))
      .map(key => buildQuery({ [key]: this.options[key] }))
      .reduce((acc, param: string) => {
        let kv = param.substr(1).split("=");
        return Object.assign(acc, {[kv[0]]: kv[1]});
      }, {});
  }

  // Params
  protected wrapObject<T>(type: string, opts?: T | T[]) {
    if (Utils.isUndefined(this.options[type]))
      this.options[type] = {};
    if (!Utils.isUndefined(opts))
      this.options[type] = opts;
    return new OptionHandler<T>(this.options, type);
  }

  protected wrapValue<T>(type: string, opts?: T) {
    if (Utils.isUndefined(opts))
      return this.options[type];
    this.options[type] = opts;
  }

  protected hasOption(type) {
    return !Utils.isUndefined(this.options[type]);
  }
  protected removeOption(type) {
    delete this.options[type];
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
      segment = { type, name, options: {} } as Segment;
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

  // Options
  select(opts?: string | string[]) {
    return this.wrapObject<string>(ODataQueryBuilder.SELECT, typeof (opts) === 'string' ? [opts] : opts);
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
  filter(opts?: Filter): OptionHandler<Filter> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<Filter>(ODataQueryBuilder.FILTER, opts);
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
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<string>(ODataQueryBuilder.ORDER_BY, opts);
  }
  removeOrderBy() { 
    this.removeOption(ODataQueryBuilder.ORDER_BY); 
  }
  expand(opts?: Expand): OptionHandler<Expand> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<Expand>(ODataQueryBuilder.EXPAND, opts);
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
  countOption(opts?: boolean | Filter) {
    return this.wrapObject(ODataQueryBuilder.COUNT, opts);
  }
  removeCountOption() {
    this.removeOption(ODataQueryBuilder.COUNT);
  }
  customOption(opts?: PlainObject) {
    return this.wrapObject(ODataQueryBuilder.CUSTOM, opts);
  }
  removeCustomOption() {
    this.removeOption(ODataQueryBuilder.CUSTOM);
  }

  // Entity key
  entityKey(opts?: string | number | PlainObject) {
    if (this.isEntitySet() || this.isNavigationProperty()) {
      let segment = this.lastSegment();
      if (Utils.isUndefined(opts)) return segment.options().get("key");
      this.removeFilter();
      this.removeOrderBy();
      this.removeCountOption();
      this.removeSkip();
      this.removeTop();
      segment.options().set("key", opts);
    }
  }
  removeEntityKey() {
    let segment = this.lastSegment();
    if (segment)
      segment.options().unset("key");
  }
  hasEntityKey() {
    let segment = this.lastSegment();
    return (segment && segment.options().has("key"));
  }

  // Segments
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
  isEntity() {
    return this.hasEntityKey();
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
