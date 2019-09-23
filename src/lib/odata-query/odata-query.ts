import { ODataService } from "../odata-service/odata.service";
import buildQuery from 'odata-query';
import { Utils } from '../utils/utils';
import { Observable } from 'rxjs';
import { ODataSet } from '../odata-response/odata-set';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { ODataQueryBatch } from './odata-query-batch';

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

export type ODataObserve = 'body' | 'events' | 'response';

export class ODataUrl {
  // URL QUERY PARTS
  public static readonly SEPARATOR = '&';
  public static readonly PATHSEP = '/';

  // OPTIONS NAMES
  public static readonly SELECT = 'select';
  public static readonly FILTER = 'filter';
  public static readonly SEARCH = 'search';
  public static readonly GROUP_BY = 'groupBy';
  public static readonly TRANSFORM = 'transform';
  public static readonly ORDER_BY = 'orderBy';
  public static readonly TOP = 'top';
  public static readonly SKIP = 'skip';
  public static readonly EXPAND = 'expand';
  public static readonly FORMAT = 'format';

  // SEGMENT NAMES
  public static readonly METADATA = 'metadata';
  public static readonly ENTITY_SET = 'entitySet';
  public static readonly ENTITY_KEY = 'entityKey';
  public static readonly SINGLETON = 'singleton';
  public static readonly TYPE_NAME = 'typeName';
  public static readonly PROPERTY = 'property';
  public static readonly NAVIGATION_PROPERTY = 'navigationProperty';
  public static readonly REF = 'ref';
  public static readonly VALUE = 'value';
  public static readonly COUNT = 'count';
  public static readonly FUNCTION_CALL = 'functionCall';
  public static readonly ACTION_CALL = 'actionCall';

  // CUSTOM OPTIONS
  public static readonly CUSTOM = 'custom';

  // CONSTANT SEGMENTS
  public static readonly $METADATA = '$metadata';
  public static readonly $REF = '$ref';
  public static readonly $VALUE = '$value';
  public static readonly $COUNT = '$count';

  // VARIABLES
  protected service: ODataService;
  protected segments: Segment[];
  protected options: PlainObject;

  constructor(
    service: ODataService,
    segments?: Segment[],
    options?: PlainObject
  ) {
    this.service = service;
    this.segments = segments || [];
    this.options = options || {};
  }

  toString(): string {
    let path = this.path();
    let queryString = Object.entries(this.params())
      .map(e => `${e[0]}=${e[1]}`)
      .join("&");
    return queryString ? `${path}?${queryString}` : path
  }

  // QUERY EXECUTION
  /*
  get<T>(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  get<T>(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'set',
    withCredentials?: boolean,
  }): Observable<ODataSet<T>>;

  get<P>(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<P>;
  */

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("GET", this, options);
  }

  post<T>(body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  post<T>(body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'set',
    withCredentials?: boolean,
  }): Observable<ODataSet<T>>;

  post<T>(body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<T>;

  post(body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("POST", this, Object.assign(options, {body}));
  }

  patch(body: any|null, etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("PATCH", this, Object.assign(options, {body, etag}));
  }

  put<T>(body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  put(body: any|null, etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("PUT", this, Object.assign(options, {body, etag}));
  }

  delete (etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("DELETE", this, Object.assign(options, {etag}));
  }

  clone<T extends ODataUrl>(type?: { new(service: ODataService, segments: Segment[], options: PlainObject): T; }): T {
    if (!type) 
      type = this.constructor as { new(service: ODataService, segments: Segment[], options: PlainObject): T; };
    let options = Object.assign({}, this.options);
    let segments = this.segments.map(segment =>
        ({ type: segment.type, name: segment.name, options: Object.assign({}, segment.options) }));
    return new type(this.service, segments, options);
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
    return new ODataUrl(service, json.segments || [], json.params || {});
  }

  path(): string {
    let segments = this.segments
      .map(segment => {
        if (segment.type == ODataUrl.FUNCTION_CALL)
          return buildQuery({ func: { [segment.name]: segment.options } }).slice(1);
        return segment.name + buildQuery(segment.options);
      });
    return segments.join(ODataUrl.PATHSEP);
  }

  params(): PlainObject {
    let odata = [
      ODataUrl.SELECT,
      ODataUrl.FILTER,
      ODataUrl.SEARCH,
      ODataUrl.GROUP_BY,
      ODataUrl.TRANSFORM,
      ODataUrl.ORDER_BY,
      ODataUrl.TOP,
      ODataUrl.SKIP,
      ODataUrl.COUNT,
      ODataUrl.EXPAND,
      ODataUrl.FORMAT]
      .filter(key => !Utils.isEmpty(this.options[key]))
      .map(key => buildQuery({ [key]: this.options[key] }))
      .reduce((acc, param: string) => {
        let index = param.indexOf("=");
        let name = param.substr(1, index - 1);
        let values = param.substr(index + 1);
        return Object.assign(acc, {[name]: values});
      }, {});
    return Object.assign(odata, this.options[ODataUrl.CUSTOM] || {});
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
    return this.wrapObject<string>(ODataUrl.SELECT, typeof (opts) === 'string' ? [opts] : opts);
  }
  hasSelect() {
    return this.hasOption(ODataUrl.SELECT);
  }
  removeSelect() {
    this.removeOption(ODataUrl.SELECT);
  }

  search(opts?: string) {
    return this.wrapValue<string>(ODataUrl.SEARCH, opts);
  }
  hasSearch() {
    return this.hasOption(ODataUrl.SEARCH);
  }
  removeSearch() {
    this.removeOption(ODataUrl.SEARCH);
  }

  filter(opts?: Filter): OptionHandler<Filter> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<Filter>(ODataUrl.FILTER, opts);
  }
  removeFilter() {
    this.removeOption(ODataUrl.FILTER);
  }

  groupBy(opts?: GroupBy) {
    return this.wrapObject(ODataUrl.GROUP_BY, opts);
  }
  removeGroupBy() {
    this.removeOption(ODataUrl.GROUP_BY);
  }

  transform(opts?: Transform) {
    return this.wrapObject(ODataUrl.TRANSFORM, opts);
  }
  removeTransform() {
    this.removeOption(ODataUrl.TRANSFORM);
  }

  orderBy(opts?: string | string[]) {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<string>(ODataUrl.ORDER_BY, opts);
  }
  removeOrderBy() { 
    this.removeOption(ODataUrl.ORDER_BY); 
  }

  expand(opts?: Expand): OptionHandler<Expand> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<Expand>(ODataUrl.EXPAND, opts);
  }
  hasExpand() {
    return this.hasOption(ODataUrl.EXPAND);
  }
  removeExpand() {
    this.removeOption(ODataUrl.EXPAND);
  }

  format(opts?: string) {
    return this.wrapValue<string>(ODataUrl.FORMAT, opts);
  }
  removeFormat() {
    this.removeOption(ODataUrl.FORMAT);
  }

  top(opts?: number) {
    return this.wrapValue<number>(ODataUrl.TOP, opts);
  }
  removeTop() {
    this.removeOption(ODataUrl.TOP);
  }

  skip(opts?: number) {
    return this.wrapValue<number>(ODataUrl.SKIP, opts);
  }
  removeSkip() {
    this.removeOption(ODataUrl.SKIP);
  }
  
  count(opts?: boolean) {
    return this.wrapValue<boolean>(ODataUrl.COUNT, opts);
  }
  removeCount() {
    this.removeOption(ODataUrl.COUNT);
  }

  custom(opts?: PlainObject) {
    return this.wrapObject(ODataUrl.CUSTOM, opts);
  }
  removeCustom() {
    this.removeOption(ODataUrl.CUSTOM);
  }

  action<T>(name: string) {
    let action = this.clone(ODataActionUrl) as ODataActionUrl<T>;
    action.name(name);
    return action;
  }

  function<T>(name: string) {
    let func = this.clone(ODataFunctionUrl) as ODataFunctionUrl<T>;
    func.name(name);
    return func;
  }
}

export class ODataCollectionUrl<T> extends ODataUrl {
  // Entity key
  entity(key?: string | number | PlainObject) {
    let entity = this.clone(ODataEntityUrl) as ODataEntityUrl<T>;
    if (key)
      entity.key(key);
    return entity;
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataSet<T>> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'set',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  getCount(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Number> {
    return (this.clone(ODataCountUrl) as ODataCountUrl).get<Number>(options);
  }

}

export class ODataSingleUrl<T> extends ODataUrl {
  property<P>(name: string) {
    let prop = this.clone(ODataPropertyUrl) as ODataPropertyUrl<P>
    prop.name(name);
    return prop;
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<T> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}

export class ODataEntitySetUrl<T> extends ODataCollectionUrl<T> {
  name(name: string) {
    return this.wrapSegment(ODataUrl.ENTITY_SET, name);
  }
}

export class ODataEntityUrl<T> extends ODataSingleUrl<T> {
  // Entity key
  key(opts?: string | number | PlainObject) {
    let segment = this.lastSegment();
    if (Utils.isUndefined(opts)) return segment.options().get("key");
    this.removeFilter();
    this.removeOrderBy();
    this.removeCount();
    this.removeSkip();
    this.removeTop();
    segment.options().set("key", opts);
  }

  navigationProperty<E>(name: string) {
    let query = this.clone(ODataNavigationPropertyUrl) as ODataNavigationPropertyUrl<E>;
    query.name(name);
    return query;
  }
}

export class ODataNavigationPropertyUrl<T> extends ODataUrl {
  name(name: string) {
    this.removeSelect();
    this.removeExpand();
    return this.wrapSegment(ODataUrl.NAVIGATION_PROPERTY, name);
  }

  ref() {
    return this.clone(ODataRefUrl) as ODataRefUrl;
  }

  single() {
    return this.clone(ODataSingleUrl) as ODataSingleUrl<T>;
  }

  collection() {
    return this.clone(ODataCollectionUrl) as ODataCollectionUrl<T>;
  }
}

export class ODataPropertyUrl<P> extends ODataUrl {
  name(name: string) {
    return this.wrapSegment(ODataUrl.PROPERTY, name);
  }

  value() {
    return this.clone(ODataValueUrl) as ODataValueUrl;
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<P> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'property',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

}

export class ODataActionUrl<T> extends ODataUrl {
  name(name: string) {
    return this.wrapSegment(ODataUrl.ACTION_CALL, name);
  }
}

export class ODataFunctionUrl<T> extends ODataUrl {
  name(name: string) {
    return this.wrapSegment(ODataUrl.FUNCTION_CALL, name);
  }

  parameters() {
    return this.lastSegment().options();
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<T> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  getSet(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataSet<T>> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'set',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  getProperty(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<T> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'property',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}

export class ODataValueUrl extends ODataUrl {
  constructor(
    service: ODataService,
    segments?: Segment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.wrapSegment(ODataUrl.VALUE, ODataUrl.$VALUE);
  }
}

export class ODataCountUrl extends ODataUrl {
  get<Number>(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Number> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}

export class ODataSingletonUrl<T> extends ODataSingleUrl<T> {
  name(name: string) {
    return this.wrapSegment(ODataUrl.SINGLETON, name);
  }
}

export class ODataRefUrl extends ODataUrl {
  constructor(
    service: ODataService,
    segments?: Segment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.wrapSegment(ODataUrl.REF, ODataUrl.$REF);
  }
}
