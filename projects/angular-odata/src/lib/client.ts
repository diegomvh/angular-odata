import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

import {
  ODataModel,
  ODataCollection
} from './models/index';
import {
  PlainObject,
  ODataResource,
  ODataBatchResource,
  ODataMetadataResource,
  ODataEntitySetResource,
  ODataSingletonResource,
  ODataFunctionResource,
  ODataActionResource,
  ODataEntityResource,
  SegmentOptionNames,
  PathSegmentNames,
  ODataPathSegments,
  ODataSegment,
  ODataQueryOptions,
  ODataResponse
} from './resources/index';
import { ODataSettings } from './settings';
import { Parser } from './types';
import { ODataApi } from './api';
import { ODataCallable, ODataEntitySet, ODataStructuredType } from './schema/index';
import { ODataRequest } from './resources/request';

@Injectable()
export class ODataClient {

  constructor(protected settings: ODataSettings) {}

  apiFor(resource: ODataResource<any>): ODataApi {
    return this.settings.apiForTypesOrDefault(resource.types());
  }

  endpointUrl(resource: ODataResource<any>) {
    const api = this.apiFor(resource);
    return `${api.serviceRootUrl}${resource}`;
  }

  parserFor<T>(resource: ODataResource<any>): Parser<T> {
    const api = this.apiFor(resource);
    if (resource.type())
      return api.parserForType<T>(resource.type());
  }

  // Resolve Building Blocks
  apiForType(type: string): ODataApi {
    return this.settings.apiForType(type);
  }

  structuredTypeForType<T>(type: string): ODataStructuredType<T> {
    return this.settings.structuredTypeForType<T>(type);
  }

  callableForType<T>(type: string): ODataCallable<T> {
    return this.settings.callableFor<T>(type);
  }

  entitySetForType(type: string): ODataEntitySet {
    return this.settings.entitySetForType(type);
  }

  parserForType<T>(type: string): Parser<T> {
    return this.settings.parserForType<T>(type);
  }

  modelForType(type: string): typeof ODataModel {
    return this.settings.modelForType(type) || ODataModel;
  }

  collectionForType(type: string): typeof ODataCollection {
    return this.settings.collectionForType(type) || ODataCollection;
  }

  fromJSON<T extends ODataResource<any>>(json: { segments: ODataSegment[], options: PlainObject }): T {
    let lastSegment = json.segments[json.segments.length - 1];
    let Ctor = (lastSegment.name === PathSegmentNames.entitySet && lastSegment.options && SegmentOptionNames.key in lastSegment.options) ? ODataEntityResource :
      {
        [PathSegmentNames.metadata]: ODataMetadataResource,
        [PathSegmentNames.singleton]: ODataSingletonResource,
        [PathSegmentNames.entitySet]: ODataEntitySetResource,
        [PathSegmentNames.action]: ODataActionResource,
        [PathSegmentNames.function]: ODataFunctionResource
      }[lastSegment.name];
    return new Ctor(this, new ODataPathSegments(json.segments), new ODataQueryOptions(json.options)) as T;
  }

  // Requests
  metadata(apiName?: string): ODataMetadataResource {
    let api = this.settings.apiByNameOrDefault(apiName);
    return ODataMetadataResource.factory(api, this);
  }

  batch(apiName?: string): ODataBatchResource {
    let api = this.settings.apiByNameOrDefault(apiName);
    return ODataBatchResource.factory(api, this);
  }

  singleton<T>(name: string, type?: string) {
    return ODataSingletonResource.factory<T>(this, name, type, new ODataPathSegments(), new ODataQueryOptions());
  }

  entitySet<T>(name: string, type?: string): ODataEntitySetResource<T> {
    return ODataEntitySetResource.factory<T>(this, name, type, new ODataPathSegments(), new ODataQueryOptions());
  }

  /**
   * Unbound Action
   * @param  {string} type?
   * @returns ODataActionResource
   */
  action<P, R>(type: string): ODataActionResource<P, R> {
    const callable = this.callableForType<R>(type);
    const path = callable ? callable.path : type;
    return ODataActionResource.factory<P, R>(this, path, type, new ODataPathSegments(), new ODataQueryOptions());
  }

  /**
   * Unbound Function
   * @param  {string} type?
   * @returns ODataFunctionResource
   */
  function<P, R>(type: string): ODataFunctionResource<P, R> {
    const callable = this.callableForType<R>(type);
    const path = callable ? callable.path : type;
    return ODataFunctionResource.factory<P, R>(this, path, type, new ODataPathSegments(), new ODataQueryOptions());
  }

  // Request headers, get, post, put, patch... etc
  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<Blob>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<string>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    observe: 'events',
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<any>>;

  request<R>(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<R>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<ODataResponse<string>>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<Object>>;

  request<R>(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<R>>;

  request(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Object>;

  request<R>(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'json',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<R>;

  request(method: string, resource: ODataResource<any>, options?: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    observe?: 'body' | 'events' | 'response',
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    withCredentials?: boolean
  }): Observable<any>;

  request(method: string, resource: ODataResource<any>, options: {
    body?: any,
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body' | 'events' | 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    withCredentials?: boolean
  } = {}): Observable<any> {

    let api = options.apiName ?
      this.settings.apiByNameOrDefault(options.apiName) :
      this.settings.apiForTypesOrDefault(resource.types());
    if (!api) throw new Error(`The types: '[${resource.types().join(", ")}]' does not belongs to any known configuration`);

    const observe: 'response' | 'events' = options.observe === 'body' ? 'response' : options.observe;

    const request = new ODataRequest(method, resource, {
      body: options.body,
      etag: options.etag,
      observe: observe,
      api: api,
      headers: options.headers,
      params: options.params,
      reportProgress: options.reportProgress,
      responseType: options.responseType,
      withCredentials: options.withCredentials
    });

    return api.request(request)
      .pipe(map((res: ODataResponse<any>) => options.observe === 'body'? res.body : res));
  }

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<Blob>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<string>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<ODataResponse<string>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<Object>>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<T>>;

  delete(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<Object>;

  delete<T>(resource: ODataResource<any>, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  delete(resource: ODataResource<any>, options: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body' | 'events' | 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('DELETE', resource, options as any);
  }

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<Blob>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<string>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  get<T>(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<ODataResponse<string>>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<Object>>;

  get<T>(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<T>>;

  get(resource: ODataResource<any>, options?: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<Object>;

  get<T>(resource: ODataResource<any>, options?: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  get(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body' | 'events' | 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('GET', resource, options as any);
  }

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<Blob>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<string>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  head<T>(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<ODataResponse<string>>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<Object>>;

  head<T>(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<T>>;

  head(resource: ODataResource<any>, options?: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<Object>;

  head<T>(resource: ODataResource<any>, options?: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  head(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body' | 'events' | 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
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
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<Blob>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<string>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  options<T>(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<ODataResponse<string>>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<Object>>;

  options<T>(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<T>>;

  options(resource: ODataResource<any>, options?: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<Object>;

  options<T>(resource: ODataResource<any>, options?: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  options(resource: ODataResource<any>, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body' | 'events' | 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('OPTIONS', resource, options as any);
  }

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<Blob>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<string>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<ODataResponse<string>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<Object>>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<T>>;

  patch(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<Object>;

  patch<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  patch(resource: ODataResource<any>, body: any | null, options: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body' | 'events' | 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('PATCH', resource, Object.assign(options, { body }) as any);
  }

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<Blob>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<string>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  post<T>(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<ODataResponse<string>>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<Object>>;

  post<T>(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<T>>;

  post(resource: ODataResource<any>, body: any | null, options?: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<Object>;

  post<T>(resource: ODataResource<any>, body: any | null, options?: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  post(resource: ODataResource<any>, body: any | null, options: {
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body' | 'events' | 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('POST', resource, Object.assign(options, { body }) as any);
  }

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<ArrayBuffer>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<Blob>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<string>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer',
    withCredentials?: boolean,
  }): Observable<HttpEvent<ArrayBuffer>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Blob>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text',
    withCredentials?: boolean,
  }): Observable<HttpEvent<string>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<Object>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'events',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<HttpEvent<T>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'arraybuffer', withCredentials?: boolean,
  }): Observable<HttpResponse<ArrayBuffer>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'blob', withCredentials?: boolean,
  }): Observable<HttpResponse<Blob>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'text', withCredentials?: boolean,
  }): Observable<ODataResponse<string>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<Object>>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe: 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<ODataResponse<T>>;

  put(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<Object>;

  put<T>(resource: ODataResource<any>, body: any | null, options?: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  put(resource: ODataResource<any>, body: any | null, options: {
    etag?: string,
    apiName?: string
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body' | 'events' | 'response',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    withCredentials?: boolean,
  } = {}): Observable<any> {
    return this.request<any>('PUT', resource, Object.assign(options, { body }) as any);
  }
}
