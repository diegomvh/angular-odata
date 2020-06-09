import { Observable } from 'rxjs';

import { Parser } from '../../types';
import { ODataClient } from '../../client';
import { Expand, Select } from '../builder';
import { QueryOptionTypes } from '../query-options';
import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataResource } from '../resource';

import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataEntityAnnotations } from '../responses';
import { HttpOptions, HttpEntityOptions } from '../http-options';
import { ODataEntityParser } from '../../parsers';

export class ODataSingletonResource<T> extends ODataResource<T> {

  // Factory
  static factory<R>(name: string, client: ODataClient, opts?: {
    segments?: ODataPathSegments,
    options?: ODataQueryOptions,
    parse?: string
  }
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();

    segments.segment(SegmentTypes.singleton, name).setParse(opts.parse);
    options.keep(QueryOptionTypes.format);
    return new ODataSingletonResource<R>(client, segments, options);
  }

  // Segments
  navigationProperty<N>(name: string) {
    let parse = this.parser instanceof ODataEntityParser? 
      this.parser.typeFor(name) : null;
    return ODataNavigationPropertyResource.factory<N>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parse
    });
  }

  property<P>(name: string) {
    let parse = this.parser instanceof ODataEntityParser? 
      this.parser.typeFor(name) : null;
    return ODataPropertyResource.factory<P>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parse
    });
  }

  action<A>(name: string, type?: string) {
    return ODataActionResource.factory<A>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parse: type
    });
  }

  function<F>(name: string, type?: string) {
    return ODataFunctionResource.factory<F>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parse: type
    });
  }

  // Client Requests
  get(options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return super.get(
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
      );
  }

  post(entity: Partial<T>, options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return super.post(this.serialize(entity),
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  put(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<[T, ODataEntityAnnotations]> {
    return super.put(this.serialize(entity),
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  patch(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<T> {
    return super.patch(this.serialize(entity),
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  delete(options?: HttpOptions & { etag?: string }): Observable<T> {
    return super.delete(
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
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
}
