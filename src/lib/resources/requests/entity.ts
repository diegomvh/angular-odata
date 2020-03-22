import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PlainObject, EntityKey } from '../../types';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { ODataQueryOptions, QueryOptionTypes, Expand, Select } from '../query-options';
import { ODataPathSegments, SegmentOptionTypes } from '../path-segments';
import { ODataClient } from '../../client';
import { ODataResource } from '../resource';
import { Types } from '../../utils/types';
import { Parser } from '../../models';
import { ODataMediaResource } from './media';
import { ODataEntityAnnotations } from '../responses';
import { HttpOptions } from '../http-options';

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
    let segment = this.segments.last();
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for key`);
    if (Types.isUndefined(key))
      return segment.option(SegmentOptionTypes.key);
    
    if (Types.isObject(key))
      key = this.parser.resolveKey(key);
    return segment.option(SegmentOptionTypes.key, key);
  }

  hasKey() {
    return this.key().value() !== undefined;
  }

  // Segments
  media() {
    return ODataMediaResource.factory<T>(
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser
    });
  }

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

  get(options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return this.client.get<T>(this, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.toEntity(body)));
  }

  post(entity: T, options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return this.client.post<T>(this, this.serialize(entity), {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.toEntity(body)));
  }

  put(entity: T, options?: HttpOptions & { etag?: string }): Observable<[T, ODataEntityAnnotations]> {
    return this.client.put<T>(this, this.serialize(entity), {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.toEntity(body)));
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
