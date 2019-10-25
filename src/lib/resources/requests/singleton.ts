import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PlainObject } from '../../types';
import { ODataClient } from '../../client';
import { Options, Select, Expand } from '../options';
import { ODataSegments, Segments } from '../segments';
import { ODataOptions } from '../options';
import { ODataResource } from '../resource';

import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { Schema, Parser } from '../../schema';
import { ODataEntitySet } from '../responses';

export class ODataSingletonRequest<T> extends ODataResource<T> {

  // Factory
  static factory<R>(name: string, client: ODataClient, opts?: {
    segments?: ODataSegments,
    options?: ODataOptions,
    parser?: Parser<R>
  }
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || new Schema<R>();

    segments.segment(Segments.singleton, name);
    options.keep(Options.format);
    return new ODataSingletonRequest<R>(client, segments, options, parser);
  }

  // Segments
  navigationProperty<N>(name: string) {
    return ODataNavigationPropertyResource.factory<N>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: (this.parser as Schema<T>).parser<N>(name) as Parser<N>
    });
  }

  property<P>(name: string) {
    return ODataPropertyResource.factory<P>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: (this.parser as Schema<T>).parser<P>(name) as Parser<P>
    });
  }

  action<A>(name: string, parser?: Parser<A>) {
    return ODataActionResource.factory<A>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: parser
    });
  }

  function<F>(name: string, parser?: Parser<F>) {
    return ODataFunctionResource.factory<F>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser
    });
  }

  // Client Requests
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
