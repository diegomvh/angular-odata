import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PlainObject, EntityKey } from '../../types';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { ODataOptions, Options, Expand, Select } from '../options';
import { ODataSegments } from '../segments';
import { ODataClient } from '../../client';
import { ODataResource } from '../resource';
import { Types } from '../../utils/types';
import { Parser } from '../../models';
import { ODataAnnotations } from '../responses/annotations';

export class ODataEntityResource<T> extends ODataResource<T> {
  // Factory
  static factory<E>(client: ODataClient, opts?: {
    segments?: ODataSegments,
    options?: ODataOptions,
    parser?: Parser<E>
  }
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || null;

    options.keep(Options.expand, Options.select, Options.format);
    return new ODataEntityResource<E>(client, segments, options, parser);
  }

  // Key
  key(key?: EntityKey) {
    let segment = this.segments.last();
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for key`);
    if (Types.isUndefined(key))
      return segment.option(Options.key);
    
    if (Types.isObject(key))
      key = this.parser.resolveKey(key);
    return segment.option(Options.key, key);
  }

  isNew() {
    let segment = this.segments.last();
    return !segment.option(Options.key).value();
  }

  // Segments
  navigationProperty<N>(name: string) {
    return ODataNavigationPropertyResource.factory<N>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser.parserFor<N>(name)
    });
  }

  property<P>(name: string) {
    return ODataPropertyResource.factory<P>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser.parserFor<P>(name)
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

  get(options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<[T, ODataAnnotations]> {
    return this.client.get<T>(this, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.toSingle(body)));
  }

  post(entity: T, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<[T, ODataAnnotations]> {
    return this.client.post<T>(this, this.serialize(entity), {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.toSingle(body)));
  }

  put(entity: T, options?: {
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<[T, ODataAnnotations]> {
    return this.client.put<T>(this, this.serialize(entity), {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.toSingle(body)));
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
