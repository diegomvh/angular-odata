import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataEntitySet } from '../../odata-response';
import { ODataClient } from '../../client';
import { Segments, Options, Select, Expand, PlainObject } from '../types';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { ODataRequest } from '../request';

import { ODataNavigationPropertyRequest } from './navigationproperty';
import { ODataPropertyRequest } from './property';
import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { Schema } from '../../schema';

export class ODataSingletonRequest<T> extends ODataRequest<T> {

  // Factory
  static factory<R>(name: string, client: ODataClient, opts?: {
    segments?: ODataSegments,
    options?: ODataOptions,
    schema?: Schema<R>
  }
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let schema = opts && opts.schema || new Schema<R>();

    segments.segment(Segments.singleton, name);
    options.keep(Options.format);
    return new ODataSingletonRequest<R>(client, segments, options, schema);
  }

  // Segments
  navigationProperty<N>(name: string) {
    return ODataNavigationPropertyRequest.factory<N>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      schema: this.schema.schemaForField<N>(name)
    });
  }

  property<P>(name: string) {
    return ODataPropertyRequest.factory<P>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      schema: this.schema.schemaForField<P>(name)
    });
  }

  action<A>(name: string) {
    return ODataActionRequest.factory<A>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      //TODO: Que esquema mando
      schema: this.schema as Schema<any>
    });
  }

  function<F>(name: string) {
    return ODataFunctionRequest.factory<F>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      //TODO: Que esquema mando
      schema: this.schema as Schema<any>
    });
  }

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'entityset',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<ODataEntitySet<T>>;

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {
    return super.get({
      headers: options.headers,
      observe: 'body',
      params: options.params,
      responseType: options.responseType,
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials,
      withCount: options.withCount
    });
  }

  post(body: T, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.post(body, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  put(body: T, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.put(body, {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  patch(body: Partial<T>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.patch(body, {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  delete(options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.delete({
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  // Options
  select(opts?: Select) {
    return this.options.option<Select>(Options.select, opts);
  }

  expand(opts?: Expand) {
    return this.options.option<Expand>(Options.expand, opts);
  }

  format(opts?: string) {
    return this.options.option<string>(Options.format, opts);
  }

  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(Options.custom, opts);
  }
}
