import { Utils } from '../utils/utils';
import { ODataService, ODataObserve } from '../odata-service/odata.service';
import { Observable } from 'rxjs';
import { ODataQueryType } from './odata-query-type';
import { ODataQueryBatch } from './odata-query-batch';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { ODataSet } from '../odata-response/odata-set';

export abstract class ODataQueryBase implements ODataQueryType {
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
  public service: ODataService;

  constructor(service: ODataService) {
    Utils.requireNotNullNorUndefined(service, 'odataService');
    this.service = service;
  }

  // ABSTRACTS
  abstract clone(): ODataQueryBase;
  abstract isEntity(): boolean;
  abstract path();
  abstract params();

  toString(): string {
    let path = this.path();
    let queryString = Object.entries(this.params())
      .map(e => `${e[0]}=${e[1]}`)
      .join("&");
    return queryString ? `${path}?${queryString}` : path
  }

  batch(): ODataQueryBatch {
    return new ODataQueryBatch(this.service);
  }

  // QUERY EXECUTION
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

  getProperty<P>(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<P> {
    return this.get<P>({
      headers: options.headers,
      observe: 'body',
      params: options.params,
      responseType: 'property',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
  }

  getSet<T>(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataSet<T>> {
    return this.get<T>({
      headers: options.headers,
      observe: 'body',
      params: options.params,
      responseType: 'set',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
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

  postSet<T>(body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataSet<T>> {
    return this.post<T>(body, {
      headers: options.headers,
      observe: 'body',
      params: options.params,
      responseType: 'set',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
  }

  postProperty<P>(body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<P> {
    return this.post<P>(body, {
      headers: options.headers,
      observe: 'body',
      params: options.params,
      responseType: 'property',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
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
}
