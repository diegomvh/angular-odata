import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PlainObject, Options, EntityKey, Select, Expand } from '../types';

import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { ODataNavigationPropertyRequest } from './navigationproperty';
import { ODataPropertyRequest } from './property';
import { ODataOptions } from '../options';
import { ODataSegments } from '../segments';
import { ODataClient } from '../../client';
import { ODataRequest } from '../request';

export class ODataEntityRequest<T> extends ODataRequest<T> {
  // Factory
  static factory<E>(service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    options.keep(Options.expand, Options.select, Options.format);
    return new ODataEntityRequest<E>(service, segments, options);
  }

  // Key
  key(opts?: EntityKey) {
    let segment = this.segments.last();
    return segment.option(Options.key, opts);
  }

  // Segments
  navigationProperty<N>(name: string) {
    let nav = ODataNavigationPropertyRequest.factory<N>(
      name, 
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
    if (this.schema)
      nav.schema = this.schema.schemaForField(name);
    return nav;
  }

  property<P>(name: string) {
    let prop = ODataPropertyRequest.factory<P>(
      name, 
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
    if (this.schema)
      prop.schema = this.schema.schemaForField(name);
    return prop;
  }

  action<A>(name: string) {
    return ODataActionRequest.factory<A>(
      name, 
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  function<F>(name: string) {
    return ODataFunctionRequest.factory<F>(
      name, 
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
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
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  post(body: T, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
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
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
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
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
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
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
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
