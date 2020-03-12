import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PlainObject, $COUNT } from '../../types';
import { ODataClient } from '../../client';
import { QueryOptionTypes, Select, Expand } from '../options';
import { ODataPathSegments, SegmentTypes } from '../segments';
import { ODataQueryOptions } from '../options';
import { ODataResource } from '../resource';

import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { Parser } from '../../models';
import { map } from 'rxjs/operators';
import { ODataEntityAnnotations, ODataCollectionAnnotations, ODataPropertyAnnotations } from '../responses';

export class ODataSingletonResource<T> extends ODataResource<T> {

  // Factory
  static factory<R>(name: string, client: ODataClient, opts?: {
    segments?: ODataPathSegments,
    options?: ODataQueryOptions,
    parser?: Parser<R>
  }
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.singleton, name);
    options.keep(QueryOptionTypes.format);
    return new ODataSingletonResource<R>(client, segments, options, parser);
  }

  // Segments
  navigationProperty<N>(name: string) {
    return ODataNavigationPropertyResource.factory<N>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser ? this.parser.parserFor<N>(name) : null
    });
  }

  property<P>(name: string) {
    return ODataPropertyResource.factory<P>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser ? this.parser.parserFor<P>(name) : null
    });
  }

  action<A>(name: string, type?: string) {
    let parser = this.client.parserForType<A>(type) as Parser<A>;
    return ODataActionResource.factory<A>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: parser
    });
  }

  function<F>(name: string, type?: string) {
    let parser = this.client.parserForType<F>(type) as Parser<F>;
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
  }): Observable<[T, ODataEntityAnnotations]>;

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'entities'
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<[T[], ODataCollectionAnnotations]>;

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'property',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<[T, ODataPropertyAnnotations]>;

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entity' | 'entities' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {

    let params = options && options.params;
    if (options && options.withCount)
      params = this.client.mergeHttpParams(params, {[$COUNT]: 'true'})

    let res$ = this.client.get<T>(this, {
      headers: options.headers,
      observe: 'body',
      params: options.params,
      responseType: 'json',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
    switch (options.responseType) {
      case 'entity':
        return res$.pipe(map((body: any) => this.toEntity(body)));
      case 'entities':
        return res$.pipe(map((body: any) => this.toEntities(body)));
      case 'property':
        return res$.pipe(map((body: any) => this.toValue(body)));
    }
  }

  post(entity: T, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return this.client.post<T>(this, this.serialize(entity), {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  put(entity: T, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return this.client.put<T>(this, this.serialize(entity), {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  patch(entity: Partial<T>, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return this.client.patch<T>(this, this.serialize(entity), {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
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
    return this.client.delete<T>(this, {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  // Options
  select(opts?: Select<T>) {
    return this.options.option<Select<T>>(QueryOptionTypes.select, opts);
  }

  expand(opts?: Expand<T>) {
    return this.options.option<Expand<T>>(QueryOptionTypes.expand, opts);
  }

  format(opts?: string) {
    return this.options.option<string>(QueryOptionTypes.format, opts);
  }

  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(QueryOptionTypes.custom, opts);
  }
}
