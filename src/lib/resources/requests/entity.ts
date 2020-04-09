import { Observable } from 'rxjs';

import { EntityKey, Parser } from '../../types';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { ODataQueryOptions, QueryOptionTypes, Expand, Select } from '../query-options';
import { ODataPathSegments, SegmentOptionTypes, SegmentTypes } from '../path-segments';
import { ODataClient } from '../../client';
import { ODataResource } from '../resource';
import { Types } from '../../utils/types';
import { ODataEntityAnnotations } from '../responses';
import { HttpOptions, HttpEntityOptions } from '../http-options';
import { ODataValueResource } from './value';

export class ODataEntityResource<T> extends ODataResource<T> {
  // Factory
  static factory<E>(client: ODataClient, opts?: {
    segments?: ODataPathSegments,
    options?: ODataQueryOptions,
    parser?: Parser<E>
  }
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    options.keep(QueryOptionTypes.expand, QueryOptionTypes.select, QueryOptionTypes.format);
    return new ODataEntityResource<E>(client, segments, options, parser);
  }

  // Key
  key(key?: EntityKey<T>) {
    let segment = this.pathSegments.last();
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for key`);
    if (!Types.isUndefined(key)) {
      if (Types.isObject(key))
        key = this.parser.resolveKey(key);
      segment.option(SegmentOptionTypes.key, key);
    }
    return segment.option(SegmentOptionTypes.key).value();
  }

  hasKey() {
    return this.key() !== undefined;
  }

  // EntitySet
  entitySet(name?: string) {
    let segment = this.pathSegments.segment(SegmentTypes.entitySet);
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for entitySet`);
    if (!Types.isUndefined(name))
      segment.name = name;
    return segment.name;
  }

  // Segments
  value() {
    return ODataValueResource.factory<T>(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser
    });
  }

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
