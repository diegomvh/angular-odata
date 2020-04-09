import { Observable } from 'rxjs';

import { PlainObject, $COUNT, Parser } from '../../types';
import { ODataClient } from '../../client';
import { QueryOptionTypes, Select, Expand } from '../query-options';
import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataResource } from '../resource';

import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { map } from 'rxjs/operators';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataValueAnnotations } from '../responses';
import { HttpOptions, HttpEntitiesOptions, HttpValueOptions, HttpEntityOptions } from '../http-options';

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
  get(options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return super.get(
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
      );
  }

  post(entity: T, options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return super.post(this.serialize(entity),
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  put(entity: T, options?: HttpOptions & { etag?: string }): Observable<[T, ODataEntityAnnotations]> {
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
