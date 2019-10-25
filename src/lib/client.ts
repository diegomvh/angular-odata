import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ODataBatchResource, ODataMetadataResource, ODataResource, ODataEntitySetResource, ODataSingletonRequest, ODataEntitySet, ODataProperty } from './resources';
import { ODataSettings } from './settings';
import { ODATA_ETAG, IF_MATCH_HEADER, $COUNT, PlainObject, VALUE } from './types';
import { Schema } from './schema';

export type ODataObserve = 'body' | 'events' | 'response';

export const addBody = <T>(
  options: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
    withCount?: boolean
  },
  body: T | null): any => {
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

@Injectable()
export class ODataClient {
  constructor(protected http: HttpClient, protected settings: ODataSettings) { }

  get maxSize() {
    return this.settings.maxSize;
  }

  resolveEtag(attrs: PlainObject): string {
    return attrs[ODATA_ETAG];
  }

  schemaForType<E>(type) {
    return this.settings.schemaForType(type) as Schema<E>;
  }

  // Requests
  metadata(): ODataMetadataResource {
    return ODataMetadataResource.factory(this);
  }

  batch(): ODataBatchResource {
    return ODataBatchResource.factory(this);
  }

  singleton<T>(name: string, type?: string) {
    let schema = type? this.schemaForType<T>(type) as Schema<T> : null;
    return ODataSingletonRequest.factory<T>(name, this, {parser: schema});
  }

  entitySet<T>(name: string, type?: string): ODataEntitySetResource<T> {
    let schema = type? this.schemaForType<T>(type) as Schema<T> : null;
    return ODataEntitySetResource.factory<T>(name, this, {parser: schema});
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
    let base = this.settings.baseUrl;
    if (!base.endsWith('/')) {
      base += '/';
    }
    return base;
  }

  createEndpointUrl(query) {
    const serviceRoot = this.serviceRoot();
    return `${serviceRoot}${query.path()}`
  }

  // Request headers, get, post, put, patch... etc
  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    observe: 'events', reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<any>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<any>>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<any>>>;

  request<R>(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<R>>;

  request<R>(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<R>>>;

  request<R>(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<R>>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  request(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  request<R>(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<R>>;

  request<R>(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<R>>>;

  request<R>(method: string, req: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<R>>>;

  request(method: string, req: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Object>;

  request(method: string, req: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  request(method: string, req: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  request<R>(method: string, req: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<R>;

  request<R>(method: string, req: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<R>>;

  request<R>(method: string, req: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataProperty<R>>;

  request(method: string, req: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    observe?: ODataObserve,
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any>;

  request(method: string, query?: ODataResource<any>, options: {
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

    let observe = <'body' | 'events' | 'response'>options.observe;

    let responseType = (['entity', 'entityset', 'property'].indexOf(options.responseType) !== -1) ? 'json' :
      <'arraybuffer' | 'blob' | 'json' | 'text'>options.responseType;

    // Etag
    let etag = options.etag || options.body && options.body[ODATA_ETAG];

    let customHeaders = {};
    if (typeof (etag) === 'string')
      customHeaders[IF_MATCH_HEADER] = etag;
    let headers = this.mergeHttpHeaders(options.headers, customHeaders);

    // Params
    let queryParams = query.params();
    let customParams = {};

    // With Count ?
    if (options.responseType === 'entityset' && options.withCount)
      customParams[$COUNT] = 'true';

    let params = this.mergeHttpParams(queryParams, options.params, customParams);

    // Credentials ?
    let withCredentials = options.withCredentials;
    if (withCredentials === undefined)
      withCredentials = this.settings.withCredentials;

    // Parser
    let parser = query.getParser();

    let extractMetadata = (body: any) => Object.keys(body)
      .filter(k => k.startsWith("@odata"))
      .reduce((acc, k) => Object.assign(acc, {[k]: body[k]}), {});

    let fromBody = (body: any) => parser.toJSON(body);
    let toEntity = (body: any) => Object.assign(extractMetadata(body), parser.parse(body));
    let toEntitySet = (body: any) => new ODataEntitySet<any>(
        Object.assign(extractMetadata(body), { [VALUE]: (body[VALUE] || []).map(v => parser.parse(v)) }));
    let toProperty = (body: any) => new ODataProperty<any>(
        Object.assign(extractMetadata(body), { [VALUE]: body[VALUE] && parser.parse(body[VALUE]) }));

    // Call http request
    let res$ = this.http.request(method, url, {
      body: options.body && fromBody(options.body) || options.body,
      headers: headers,
      observe: observe,
      params: params,
      reportProgress: options.reportProgress,
      responseType: responseType,
      withCredentials: withCredentials
    });

    // Context Error Handler
    if (this.settings.errorHandler) {
      res$ = res$.pipe(
        catchError(this.settings.errorHandler)
      );
    }

    // ODataResponse
    switch (options.observe || 'body') {
      case 'body':
        switch (options.responseType) {
          case 'entity':
            return res$.pipe(map((body: any) => body && toEntity(body) || body));
          case 'entityset':
            return res$.pipe(map((body: any) => body && toEntitySet(body) || body));
          case 'property':
            return res$.pipe(map((body: any) => body && toProperty(body) || body));
        }
      case 'response':
        switch (options.responseType) {
          case 'entity':
            return res$.pipe(map((res: HttpResponse<any>) => new HttpResponse<any>({
              body: res.body && toEntity(res.body) || res.body,
              headers: res.headers,
              status: res.status,
              statusText: res.statusText,
              url: res.url
            })
            ));
          case 'entityset':
            return res$.pipe(map((res: HttpResponse<any>) => new HttpResponse<any>({
              body: res.body && toEntitySet(res.body) || res.body,
              headers: res.headers,
              status: res.status,
              statusText: res.statusText,
              url: res.url
            })
            ));
          case 'property':
            return res$.pipe(map((res: HttpResponse<any>) => new HttpResponse<any>({
              body: res.body && toProperty(res.body) || res.body,
              headers: res.headers,
              status: res.status,
              statusText: res.statusText,
              url: res.url
            })
            ));
        }
    }
    return res$;
  }

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  delete<T>(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  delete<T>(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  delete<T>(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  delete<T>(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  delete<T>(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  delete<T>(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  delete(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  delete<T>(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  delete<T>(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  delete<T>(req: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  delete(req: ODataResource<any>, options: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('DELETE', req, options as any);
  }

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  get<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  get<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  get<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  get<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  get<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  get<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  get(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  get(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  get(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  get<T>(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  get<T>(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  get<T>(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  get(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('GET', req, options as any);
  }

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  head<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  head<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  head<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  head<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  head<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  head<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  head(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  head(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  head(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  head<T>(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  head<T>(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  head<T>(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  head(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('HEAD', req, options as any);
  }

  jsonp(req: ODataResource<any>, callbackParam: string): Observable<Object>;

  jsonp<T>(req: ODataResource<any>, callbackParam: string): Observable<T>;

  jsonp<T>(req: ODataResource<any>, callbackParam: string): Observable<T> {
    return this.request<any>('JSONP', req, {
      params: new HttpParams().append(callbackParam, 'JSONP_CALLBACK'),
      observe: 'body',
      responseType: 'json',
    });
  }

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  options<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  options<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  options<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  options<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  options<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  options<T>(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  options(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  options(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  options(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  options<T>(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  options<T>(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  options<T>(req: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  options(req: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('OPTIONS', req, options as any);
  }

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  patch<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  patch<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  patch<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  patch<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  patch<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  patch<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  patch(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  patch<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  patch<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  patch<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  patch(req: ODataResource<any>, body: any | null, options: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('PATCH', req, addBody(options, body));
  }

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  post<T>(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  post<T>(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  post<T>(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  post<T>(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  post<T>(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  post<T>(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  post(req: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  post(req: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  post(req: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  post<T>(req: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  post<T>(req: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  post<T>(req: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  post(req: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('POST', req, addBody(options, body));
  }

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  put<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  put<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset', withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  put<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property', withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  put<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  put<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  put<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  put(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  put<T>(req: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  put<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  put<T>(req: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  put(req: ODataResource<any>, body: any | null, options: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('PUT', req, addBody(options, body));
  }
}
