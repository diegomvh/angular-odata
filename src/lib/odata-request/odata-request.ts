import { ODataService } from "../odata-service/odata.service";
import buildQuery from 'odata-query';
import { Utils } from '../utils/utils';
import { Observable } from 'rxjs';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Segment, PlainObject, OptionHandler, SegmentHandler, Filter, GroupBy, Transform, Expand } from './odata-request-handlers';
import { ODataFunctionUrl } from './odata-function-request';

export type ODataObserve = 'body' | 'events' | 'response';

export abstract class ODataRequest {
  // VARIABLES
  protected service: ODataService;

  constructor(service: ODataService) {
    this.service = service;
  }

  protected get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("GET", this, options);
  }

  protected post(body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("POST", this, Object.assign(options, {body}));
  }

  protected patch(body: any|null, etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("PATCH", this, Object.assign(options, {body, etag}));
  }

  protected put(body: any|null, etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("PUT", this, Object.assign(options, {body, etag}));
  }

  protected delete (etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.service.request("DELETE", this, Object.assign(options, {etag}));
  }

  static fromJSON<T extends ODataRequest>(service: ODataService, json?: any, type?: { new(service: ODataService): T; }): T {
    if (!type) 
      type = this.constructor as { new(service: ODataService): T; };
    let instance = new type(service);
    return Object.assign(instance, json || {});
  }

  abstract clone<T extends ODataRequest>(type?: { new(service: ODataService): T; }): T;
  abstract toJSON();
  abstract toString();
  abstract path();
  abstract params();
}

export class ODataRequestBase extends ODataRequest {
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
  public static readonly ENTITY_KEY = 'entityKey';
  public static readonly TYPE_NAME = 'typeName';
  public static readonly PROPERTY = 'property';
  public static readonly NAVIGATION_PROPERTY = 'navigationProperty';
  public static readonly COUNT = 'count';

  // CUSTOM OPTIONS
  public static readonly CUSTOM = 'custom';

  // CONSTANT SEGMENTS
  public static readonly $METADATA = '$metadata';
  public static readonly $COUNT = '$count';

  // VARIABLES
  protected segments: Segment[];
  protected options: PlainObject;

  constructor(
    service: ODataService,
    segments?: Segment[],
    options?: PlainObject
  ) {
    super(service)
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

  path(): string {
    let segments = this.segments
      .map(segment => {
        if (segment.type == ODataFunctionUrl.FUNCTION_CALL)
          return buildQuery({ func: { [segment.name]: segment.options } }).slice(1);
        return segment.name + buildQuery(segment.options);
      });
    return segments.join(ODataRequestBase.PATHSEP);
  }

  params(): PlainObject {
    let odata = [
      ODataRequestBase.SELECT,
      ODataRequestBase.FILTER,
      ODataRequestBase.SEARCH,
      ODataRequestBase.GROUP_BY,
      ODataRequestBase.TRANSFORM,
      ODataRequestBase.ORDER_BY,
      ODataRequestBase.TOP,
      ODataRequestBase.SKIP,
      ODataRequestBase.COUNT,
      ODataRequestBase.EXPAND,
      ODataRequestBase.FORMAT]
      .filter(key => !Utils.isEmpty(this.options[key]))
      .map(key => buildQuery({ [key]: this.options[key] }))
      .reduce((acc, param: string) => {
        let index = param.indexOf("=");
        let name = param.substr(1, index - 1);
        let values = param.substr(index + 1);
        return Object.assign(acc, {[name]: values});
      }, {});
    return Object.assign(odata, this.options[ODataRequestBase.CUSTOM] || {});
  }

  clone<T extends ODataRequest>(type?: { new(service: ODataService, segments: Segment[], options: PlainObject): T; }): T {
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
    return this.wrapObject<string>(ODataRequestBase.SELECT, typeof (opts) === 'string' ? [opts] : opts);
  }
  hasSelect() {
    return this.hasOption(ODataRequestBase.SELECT);
  }
  removeSelect() {
    this.removeOption(ODataRequestBase.SELECT);
  }

  search(opts?: string) {
    return this.wrapValue<string>(ODataRequestBase.SEARCH, opts);
  }
  hasSearch() {
    return this.hasOption(ODataRequestBase.SEARCH);
  }
  removeSearch() {
    this.removeOption(ODataRequestBase.SEARCH);
  }

  filter(opts?: Filter): OptionHandler<Filter> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<Filter>(ODataRequestBase.FILTER, opts);
  }
  removeFilter() {
    this.removeOption(ODataRequestBase.FILTER);
  }

  groupBy(opts?: GroupBy) {
    return this.wrapObject(ODataRequestBase.GROUP_BY, opts);
  }
  removeGroupBy() {
    this.removeOption(ODataRequestBase.GROUP_BY);
  }

  transform(opts?: Transform) {
    return this.wrapObject(ODataRequestBase.TRANSFORM, opts);
  }
  removeTransform() {
    this.removeOption(ODataRequestBase.TRANSFORM);
  }

  orderBy(opts?: string | string[]) {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<string>(ODataRequestBase.ORDER_BY, opts);
  }
  removeOrderBy() { 
    this.removeOption(ODataRequestBase.ORDER_BY); 
  }

  expand(opts?: Expand): OptionHandler<Expand> {
    opts = typeof (opts) === 'string' ? [opts] : opts;
    return this.wrapObject<Expand>(ODataRequestBase.EXPAND, opts);
  }
  hasExpand() {
    return this.hasOption(ODataRequestBase.EXPAND);
  }
  removeExpand() {
    this.removeOption(ODataRequestBase.EXPAND);
  }

  format(opts?: string) {
    return this.wrapValue<string>(ODataRequestBase.FORMAT, opts);
  }
  removeFormat() {
    this.removeOption(ODataRequestBase.FORMAT);
  }

  top(opts?: number) {
    return this.wrapValue<number>(ODataRequestBase.TOP, opts);
  }
  removeTop() {
    this.removeOption(ODataRequestBase.TOP);
  }

  skip(opts?: number) {
    return this.wrapValue<number>(ODataRequestBase.SKIP, opts);
  }
  removeSkip() {
    this.removeOption(ODataRequestBase.SKIP);
  }
  
  count(opts?: boolean) {
    return this.wrapValue<boolean>(ODataRequestBase.COUNT, opts);
  }
  removeCount() {
    this.removeOption(ODataRequestBase.COUNT);
  }

  custom(opts?: PlainObject) {
    return this.wrapObject(ODataRequestBase.CUSTOM, opts);
  }
  removeCustom() {
    this.removeOption(ODataRequestBase.CUSTOM);
  }
}

