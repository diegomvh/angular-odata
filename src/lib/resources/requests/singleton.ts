import { Observable } from 'rxjs';

import { PlainObject, $COUNT } from '../../types';
import { ODataClient } from '../../client';
import { QueryOptionTypes, Select, Expand } from '../query-options';
import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataResource } from '../resource';

import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { Parser } from '../../models';
import { map } from 'rxjs/operators';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataPropertyAnnotations } from '../responses';
import { HttpOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpEntityOptions } from '../http-options';

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
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser ? this.parser.parserFor<N>(name) : null
    });
  }

  property<P>(name: string) {
    return ODataPropertyResource.factory<P>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser ? this.parser.parserFor<P>(name) : null
    });
  }

  action<A>(name: string, type?: string) {
    let parser = this.client.parserForType<A>(type) as Parser<A>;
    return ODataActionResource.factory<A>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: parser
    });
  }

  function<F>(name: string, type?: string) {
    let parser = this.client.parserForType<F>(type) as Parser<F>;
    return ODataFunctionResource.factory<F>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser
    });
  }

  // Client Requests
  get(options?: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;

  get(options?: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;

  get(options?: HttpPropertyOptions): Observable<[T, ODataPropertyAnnotations]>;

  get(options?: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions): Observable<any> {

    let params = options && options.params;
    if (options && options.withCount)
      params = this.client.mergeHttpParams(params, {[$COUNT]: 'true'})

    let res$ = this.client.get<T>(this, {
      headers: options && options.headers,
      observe: 'body',
      params: params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
    if (options && options.responseType) {
      switch (options.responseType) {
        case 'entity':
          return res$.pipe(map((body: any) => this.toEntity(body)));
        case 'entities':
          return res$.pipe(map((body: any) => this.toEntities(body)));
        case 'property':
          return res$.pipe(map((body: any) => this.toValue(body)));
      }
    }
    return res$;
  }

  post(entity: T, options?: HttpOptions): Observable<T> {
    return this.client.post<T>(this, this.serialize(entity), {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  put(entity: T, options?: HttpOptions & { etag?: string }): Observable<T> {
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

  patch(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<T> {
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

  delete(options?: HttpOptions & { etag?: string }): Observable<T> {
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

  // Query
  select(opts?: Select<T>) {
    return this.queryOptions.option<Select<T>>(QueryOptionTypes.select, opts);
  }

  expand(opts?: Expand<T>) {
    return this.queryOptions.option<Expand<T>>(QueryOptionTypes.expand, opts);
  }

  format(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionTypes.format, opts);
  }

  custom(opts?: PlainObject) {
    return this.queryOptions.option<PlainObject>(QueryOptionTypes.custom, opts);
  }
}
