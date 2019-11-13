import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ODataBatchResource, ODataMetadataResource, ODataResource, ODataEntitySetResource, ODataSingletonResource, ODataEntitySet, ODataProperty, ODataEntityResource, ODataFunctionResource, ODataActionResource } from './resources';
import { ODataSettings } from './settings';
import { ODATA_ETAG, IF_MATCH_HEADER, $COUNT, PlainObject, VALUE, ODATA_CONTEXT, ODATA_TYPE } from './types';
import { Schema, Parser } from './schema';
import { ODataModel, ODataModelCollection } from './models';

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

  schemaForType<E>(type: string) {
    return this.settings.schemaForType(type) as Schema<E>;
  }

  modelForType(type: string) {
    return this.settings.modelForType(type) as typeof ODataModel;
  }

  collectionForType(type: string) {
    return this.settings.collectionForType(type) as typeof ODataModelCollection;
  }

  newResourceForContext(resource: ODataResource<any>, attrs: any) {
    if (resource instanceof ODataEntitySetResource)
      return resource.entity(attrs);
    if (resource instanceof ODataFunctionResource || resource instanceof ODataActionResource) {
      // It depends on the defined return scheme and context
      let ctx = attrs[ODATA_CONTEXT] as string;
      ctx = ctx.substr(ctx.indexOf("#") + 1);
      if (ctx.startsWith("Collection(") && ctx.endsWith(")")) {
        let type = ctx.substr(11, ctx.length - 12);
        let schema = type ? this.schemaForType<any>(type) as Schema<any> : null;
        return ODataEntityResource.factory<any>(this, {parser: schema});
      } else if (ctx.endsWith("$entity")) {
        let type = (ODATA_TYPE in attrs)? 
          (attrs[ODATA_TYPE] as string).substr(1) :
          resource.type();
        let eset = ctx.split(/(\w+)/)[1];
        return this.entitySet(eset, type).entity(attrs);
      }
    }
    return resource.clone<any>();
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
    return ODataSingletonResource.factory<T>(name, this, {parser: schema});
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

  createEndpointUrl(resource) {
    const serviceRoot = this.serviceRoot();
    return `${serviceRoot}${resource.path()}`
  }

  // Request headers, get, post, put, patch... etc
  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    observe: 'events', reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<any>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<any>>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<any>>>;

  request<R>(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<R>>;

  request<R>(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<R>>>;

  request<R>(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<R>>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  request<R>(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<R>>;

  request<R>(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<R>>>;

  request<R>(method: string, resource: ODataResource<any>, options: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<R>>>;

  request(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Object>;

  request(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  request(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  request<R>(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json' | 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<R>;

  request<R>(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<R>>;

  request<R>(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataProperty<R>>;

  request(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    observe?: ODataObserve,
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any>;

  request(method: string, resource?: ODataResource<any>, options: {
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
    const url = this.createEndpointUrl(resource);

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
    let resourceParams = resource.params();
    let customParams = {};

    // With Count ?
    if (options.responseType === 'entityset' && options.withCount)
      customParams[$COUNT] = 'true';

    let params = this.mergeHttpParams(resourceParams, options.params, customParams);

    // Credentials ?
    let withCredentials = options.withCredentials;
    if (withCredentials === undefined)
      withCredentials = this.settings.withCredentials;

    let toBodyOrNull = (attrs: any): any | null => {
      if (attrs) 
        return resource.serialize(attrs);
      return null;
    }
    let toEntityOrNull = (body: any): any | null  => {
      if (body)
        return resource.deserialize(body, this.newResourceForContext(resource, body));
      return null;
    }
    let toEntitySetOrNull = (body: any): ODataEntitySet<any> | null => {
      if (body != null) {
        body[VALUE] = resource.deserialize(body[VALUE], this.newResourceForContext(resource, body));
        return new ODataEntitySet<any>(body);
      }
      return null;
    }
    let toPropertyOrNull = (body: any): ODataProperty<any> | null => {
      if (body != null) {
        body[VALUE] = resource.deserialize(body[VALUE], this.newResourceForContext(resource, body));
        return new ODataProperty<any>(body);
      }
      return null;
    }

    // Call http request
    let res$ = this.http.request(method, url, {
      body: toBodyOrNull(options.body),
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
            return res$.pipe(map((body: any) => toEntityOrNull(body)));
          case 'entityset':
            return res$.pipe(map((body: any) => toEntitySetOrNull(body)));
          case 'property':
            return res$.pipe(map((body: any) => toPropertyOrNull(body)));
        }
      case 'response':
        switch (options.responseType) {
          case 'entity':
            return res$.pipe(map((res: HttpResponse<any>) => new HttpResponse<any>({
              body: toEntityOrNull(res.body),
              headers: res.headers,
              status: res.status,
              statusText: res.statusText,
              url: res.url
            })
            ));
          case 'entityset':
            return res$.pipe(map((res: HttpResponse<any>) => new HttpResponse<any>({
              body: toEntitySetOrNull(res.body),
              headers: res.headers,
              status: res.status,
              statusText: res.statusText,
              url: res.url
            })
            ));
          case 'property':
            return res$.pipe(map((res: HttpResponse<any>) => new HttpResponse<any>({
              body: toPropertyOrNull(res.body),
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

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  delete(resource: ODataResource<any>, options: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('DELETE', resource, options as any);
  }

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  get<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  get<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  get<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  get<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  get<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  get<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  get(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  get(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  get(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  get<T>(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  get<T>(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  get<T>(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  get(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('GET', resource, options as any);
  }

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  head<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  head<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  head<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  head<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  head<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  head<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  head(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  head(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  head(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  head<T>(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  head<T>(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  head<T>(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  head(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('HEAD', resource, options as any);
  }

  jsonp(resource: ODataResource<any>, callbackParam: string): Observable<Object>;

  jsonp<T>(resource: ODataResource<any>, callbackParam: string): Observable<T>;

  jsonp<T>(resource: ODataResource<any>, callbackParam: string): Observable<T> {
    return this.request<any>('JSONP', resource, {
      params: new HttpParams().append(callbackParam, 'JSONP_CALLBACK'),
      observe: 'body',
      responseType: 'json',
    });
  }

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  options<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  options<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  options<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  options<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  options<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  options<T>(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  options(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  options(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  options(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  options<T>(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  options<T>(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  options<T>(resource: ODataResource<any>, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  options(resource: ODataResource<any>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('OPTIONS', resource, options as any);
  }

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  patch(resource: ODataResource<any>, body: any | null, options: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('PATCH', resource, addBody(options, body));
  }

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  post<T>(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  post<T>(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  post<T>(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  post<T>(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  post<T>(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  post<T>(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  post(resource: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  post(resource: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  post(resource: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  post<T>(resource: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  post<T>(resource: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  post<T>(resource: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('POST', resource, addBody(options, body));
  }

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<Object>>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<Object>>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset', withCredentials?: boolean,
  }): Observable<HttpEvent<ODataEntitySet<T>>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property', withCredentials?: boolean,
  }): Observable<HttpEvent<ODataProperty<T>>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpResponse<string>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Object>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<Object>>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<Object>>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<HttpResponse<T>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataEntitySet<T>>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ODataProperty<T>>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<Object>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<Object>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<Object>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json' | 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
  }): Observable<ODataEntitySet<T>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  put(resource: ODataResource<any>, body: any | null, options: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'entity' | 'entityset' | 'property',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('PUT', resource, addBody(options, body));
  }
}
