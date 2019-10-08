import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ODataEntitySet, ODataProperty } from './odata-response';
import { ODataBatchRequest, ODataEntityRequest, ODataMetadataRequest, ODataRequest, ODataEntitySetRequest, ODataSingletonRequest } from './odata-request';
import { ODATA_CONFIG, ODataConfig } from './config';
import { ODataModel } from './odata-model';

export type ODataObserve = 'body' | 'events' | 'response';

function addBody<T>(
    options: {
      etag?: string,
      headers?: HttpHeaders | {[header: string]: string | string[]},
      observe?: ODataObserve,
      params?: HttpParams | {[param: string]: string | string[]},
      reportProgress?: boolean,
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
      withCredentials?: boolean,
      withCount?: boolean
    },
    body: T | null): any {
  return {
    body,
    etag: options.etag,
    headers: options.headers,
    observe: options.observe,
    params: options.params,
    reportProgress: options.reportProgress,
    responseType: options.responseType,
    withCredentials: options.withCredentials,
    withCount: options.withCount
  };
}

function addEtag(
    options: {
      body?: any,
      headers?: HttpHeaders | {[header: string]: string | string[]},
      observe?: ODataObserve,
      params?: HttpParams | {[param: string]: string | string[]},
      reportProgress?: boolean,
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
      withCredentials?: boolean,
      withCount?: boolean
    },
    etag: string): any {
  return {
    etag,
    body: options.body,
    headers: options.headers,
    observe: options.observe,
    params: options.params,
    reportProgress: options.reportProgress,
    responseType: options.responseType,
    withCredentials: options.withCredentials,
    withCount: options.withCount
  };
}

@Injectable()
export class ODataClient {
  public static readonly ODATA_CONTEXT = '@odata.context';
  public static readonly ODATA_ETAG = '@odata.etag';
  public static readonly ODATA_ID = '@odata.id';

  public static readonly $ID = '$id';
  public static readonly $COUNT = '$count';
  public static readonly $TOP = '$top';

  public static readonly IF_MATCH_HEADER = 'If-Match';

  constructor(protected http: HttpClient, @Inject(ODATA_CONFIG) protected config: ODataConfig) {
    // Resolve types
    Object.values(config.models || [])
      .forEach(model => (model as typeof ODataModel).schema.configure(config));
  }

  resolveEtag<T>(entity: Partial<T>): string {
    return entity[ODataClient.ODATA_ETAG];
  }

  resolveTarget<T>(type: 'body' | 'query', target: ODataEntityRequest<T>) {
    //TODO: Target has key?
    let key = (type === 'body') ?
      ODataClient.ODATA_ID : ODataClient.$ID;
    return { [key]: this.createEndpointUrl(target)};
  }

  public metadata(): ODataMetadataRequest {
    return ODataMetadataRequest.factory(this);
  }

  batch(): ODataBatchRequest {
    return ODataBatchRequest.factory(this);
  }

  singleton<T>(name: string) {
    return ODataSingletonRequest.factory<T>(name, this);
  }

  entitySet<T>(name: string): ODataEntitySetRequest<T> {
    return ODataEntitySetRequest.factory<T>(name, this);
  }

  mergeHttpHeaders(...headers: (HttpHeaders | { [header: string]: string | string[]; })[]): HttpHeaders {
    let attrs = {};
    headers.forEach(header => {
      if (header instanceof HttpHeaders) {
        const httpHeader = header as HttpHeaders;
        attrs = httpHeader.keys().reduce((acc, key) => Object.assign(acc, { [key]: httpHeader.getAll(key) }), attrs);
      } else if (typeof (header) === 'object')
        attrs = Object.assign(attrs, header);
    });
    return new HttpHeaders(attrs);
  }

  mergeHttpParams(...params: (HttpParams | { [param: string]: string | string[]; })[]): HttpParams {
    let attrs = {};
    params.forEach(param => {
      if (param instanceof HttpParams) {
        const httpParam = param as HttpParams;
        attrs = httpParam.keys().reduce((acc, key) => Object.assign(acc, { [key]: httpParam.getAll(key) }), attrs);
      } else if (typeof (param) === 'object')
        attrs = Object.assign(attrs, param);
    });
    return new HttpParams({ fromObject: attrs });
  }

  serviceRoot(): string {
    let base = this.config.baseUrl;
    if (!base.endsWith('/')) {
      base += '/';
    }
    return base;
  }

  createEndpointUrl(query) {
    const serviceRoot = this.serviceRoot();
    return `${serviceRoot}${query.path()}`
  }

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    observe: 'events', reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<any>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<any>>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<any>>>;

  request<R>(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<R>>;

  request<R>(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<R>>>;

  request<R>(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<R>>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  request(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  request<R>(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<R>>;

  request<R>(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<R>>>;

  request<R>(method: string, req: ODataRequest, options: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<R>>>;

  request(method: string, req: ODataRequest, options?: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'entity',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Object>;

  request(method: string, req: ODataRequest, options?: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  request(method: string, req: ODataRequest, options?: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  request<R>(method: string, req: ODataRequest, options?: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'entity',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<R>;

  request<R>(method: string, req: ODataRequest, options?: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<R>>;

  request<R>(method: string, req: ODataRequest, options?: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataProperty<R>>;

  request(method: string, req: ODataRequest, options?: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    observe?: ODataObserve,
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any>;

  request(method: string, query?: ODataRequest, options: {
    body?: any,
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {

    // The Url
    const url = this.createEndpointUrl(query);

    let observe = <'body'|'events'|'response'>options.observe;

    let responseType = (['entity', 'entityset', 'property'].indexOf(options.responseType) !== -1) ? 'json' :
      <'arraybuffer' | 'blob' | 'json' | 'text'>options.responseType;

    // Headers
    let customHeaders = {};
    if (typeof (options.etag) === 'string')
      customHeaders[ODataClient.IF_MATCH_HEADER] = options.etag;
    let headers = this.mergeHttpHeaders(options.headers, customHeaders);

    // Params
    let queryParams = query.params();
    let customParams = {};
    
    // With Count ?
    let withCount = options.withCount;
    if (withCount || this.config.withCount)
      customParams[ODataClient.$COUNT] = 'true';
    
    // Page Size?
    if (options.responseType === 'entityset' && !(ODataClient.$TOP in queryParams) && this.config.maxPageSize)
      customParams[ODataClient.$TOP] = this.config.maxPageSize;

    let params = this.mergeHttpParams(queryParams, options.params, customParams);

    // Credentials ?
    let withCredentials = options.withCredentials;
    if (withCredentials === undefined)
      withCredentials = this.config.withCredentials;

    // Call http request
    let res$ = this.http.request(method, url, {
      body: options.body,
      headers: headers,
      observe: observe,
      params: params,
      reportProgress: options.reportProgress,
      responseType: responseType,
      withCredentials: withCredentials
    });

    // Context Error Handler
    if (this.config.errorHandler) {
      res$ = res$.pipe(
        catchError(this.config.errorHandler)
      );
    }

    // ODataResponse
    switch(options.observe || 'body') {
      case 'body':
        switch(options.responseType) {
          case 'entity':
            return res$.pipe(map((body: any) => body));
          case 'entityset':
            return res$.pipe(map((body: any) => new ODataEntitySet<any>(body)));
          case 'property':
            return res$.pipe(map((body: any) => new ODataProperty<any>(body)));
        }
      case 'response':
        switch(options.responseType) {
          case 'entity':
            return res$.pipe(map((res: HttpResponse<any>) => res));
          case 'entityset':
            return res$.pipe(map((res: HttpResponse<any>) => new HttpResponse<any>({
              body: new ODataEntitySet<any>(res.body), 
              headers: res.headers, 
              status: res.status, 
              statusText: res.statusText, 
              url: res.url})
            ));
          case 'property':
            return res$.pipe(map((res: HttpResponse<any>) => new HttpResponse<any>({
              body: new ODataProperty<any>(res.body), 
              headers: res.headers, 
              status: res.status, 
              statusText: res.statusText, 
              url: res.url})
            ));
        }
      }
    return res$;
  }

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  delete<T>(req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  delete<T>(req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  delete<T>(req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  delete<T>(req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  delete<T>(req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  delete<T>(req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  delete (req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  delete<T>(req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  delete<T>(req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  delete<T>(req: ODataRequest, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  delete (req: ODataRequest, etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('DELETE', req, addEtag(options, etag));
  }

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  get<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  get<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  get<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  get<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  get<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  get<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  get(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  get(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  get(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  get<T>(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  get<T>(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  get<T>(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  get(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('GET', req, options as any);
  }

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  head<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  head<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  head<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  head<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  head<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  head<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  head(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  head(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  head(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  head<T>(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  head<T>(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  head<T>(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  head(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('HEAD', req, options as any);
  }

  jsonp(req: ODataRequest, callbackParam: string): Observable<Object>;

  jsonp<T>(req: ODataRequest, callbackParam: string): Observable<T>;

  jsonp<T>(req: ODataRequest, callbackParam: string): Observable<T> {
    return this.request<any>('JSONP', req, {
      params: new HttpParams().append(callbackParam, 'JSONP_CALLBACK'),
      observe: 'body',
      responseType: 'json',
    });
  }

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  options<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  options<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  options<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  options<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  options<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  options<T>(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  options(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  options(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  options(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  options<T>(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  options<T>(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  options<T>(req: ODataRequest, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  options(req: ODataRequest, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('OPTIONS', req, options as any);
  }

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  patch<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  patch<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  patch<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  patch<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  patch<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  patch<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  patch<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  patch<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  patch<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  patch(req: ODataRequest, body: any|null, etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('PATCH', req, addEtag(addBody(options, body), etag));
  }

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  post<T>(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  post<T>(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  post<T>(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  post<T>(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  post<T>(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  post<T>(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  post(req: ODataRequest, body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  post(req: ODataRequest, body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  post(req: ODataRequest, body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  post<T>(req: ODataRequest, body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  post<T>(req: ODataRequest, body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  post<T>(req: ODataRequest, body: any|null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  post(req: ODataRequest, body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('POST', req, addBody(options, body));
  }

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  put<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events', responseType?: 'json'|'entity', withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  put<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events', responseType?: 'entityset', withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  put<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'events', responseType?: 'property', withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  put<T>(req: ODataRequest, body: any|null, etag?:string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  put<T>(req: ODataRequest, body: any|null, etag?:string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  put<T>(req: ODataRequest, body: any|null, etag?:string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  put(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  put<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json'|'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  put<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  put<T>(req: ODataRequest, body: any|null, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  put(req: ODataRequest, body: any|null, etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('PUT', req, addEtag(addBody(options, body), etag));
  }
}
