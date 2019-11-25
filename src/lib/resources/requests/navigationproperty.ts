import { ODataResource } from '../resource';
import { Options, Select, Expand, Transform, Filter, OrderBy, GroupBy } from '../options';

import { ODataRefResource } from './ref';
import { ODataOptions } from '../options';
import { ODataSegments, Segments } from '../segments';
import { ODataClient } from '../../client';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, empty } from 'rxjs';
import { EntityKey, PlainObject, $COUNT } from '../../types';
import { ODataCountResource } from './count';
import { ODataPropertyResource } from './property';
import { Parser } from '../../models';
import { Types } from '../../utils/types';
import { expand, concatMap, toArray, map } from 'rxjs/operators';
import { ODataMetadata } from '../responses';
import { ODataAnnotations } from '../responses/annotations';

export class ODataNavigationPropertyResource<T> extends ODataResource<T> {
  // Factory
  static factory<E>(name: string, client: ODataClient, opts?: {
    segments?: ODataSegments,
    options?: ODataOptions,
    parser?: Parser<E>
  }
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || null;

    segments.segment(Segments.navigationProperty, name);
    options.keep(Options.format);
    return new ODataNavigationPropertyResource<E>(client, segments, options, parser);
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
  ref() {
    return ODataRefResource.factory(
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser
    });
  }

  entity(opts?: EntityKey) {
    this.key(opts);
    return this;
  }

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

  count() {
    return ODataCountResource.factory(
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser
    });
  }

  // Client requests
  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'entity',
    withCredentials?: boolean,
  }): Observable<[T, ODataAnnotations]>;

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'entityset',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<[T[], ODataAnnotations]>;

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entity' | 'entityset',
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
      params: params,
      responseType: 'json',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
    switch (options.responseType) {
      case 'entity':
        return res$.pipe(map((body: any) => this.toSingle(body)));
      case 'entityset':
        return res$.pipe(map((body: any) => this.toCollection(body)));
    }
    return res$;
  }

  // Options
  select(opts?: Select) {
    return this.options.option<Select>(Options.select, opts);
  }

  expand(opts?: Expand) {
    return this.options.option<Expand>(Options.expand, opts);
  }

  transform(opts?: Transform) {
    return this.options.option<Transform>(Options.transform, opts);
  }

  search(opts?: string) {
    return this.options.option<string>(Options.search, opts);
  }

  filter(opts?: Filter) {
    return this.options.option<Filter>(Options.filter, opts);
  }

  groupBy(opts?: GroupBy) {
    return this.options.option(Options.groupBy, opts);
  }

  orderBy(opts?: OrderBy) {
    return this.options.option<OrderBy>(Options.orderBy, opts);
  }

  format(opts?: string) {
    return this.options.option<string>(Options.format, opts);
  }

  top(opts?: number) {
    return this.options.option<number>(Options.top, opts);
  }

  skip(opts?: number) {
    return this.options.option<number>(Options.skip, opts);
  }

  skiptoken(opts?: string) {
    return this.options.option<string>(Options.skiptoken, opts);
  }

  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(Options.custom, opts);
  }

  // Custom
  single(options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<[T, ODataAnnotations]> {
    return this
      .get({ 
        headers: options && options.headers,
        params: options && options.params,
        reportProgress: options && options.reportProgress,
        responseType: 'entity', 
        withCredentials: options && options.reportProgress});
  }

  collection(options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<[T[], ODataAnnotations]> {
    return this
      .get({ 
        headers: options && options.headers,
        params: options && options.params,
        reportProgress: options && options.reportProgress,
        responseType: 'entityset', 
        withCredentials: options && options.reportProgress,
        withCount: true });
  }

  all(options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<T[]> {
    let fetch = (opts?: { skip?: number, skiptoken?: string, top?: number }): Observable<[T[], ODataAnnotations]> => {
      if (opts) {
        if (opts.skiptoken)
          this.skiptoken(opts.skiptoken);
        else if (opts.skip)
          this.skip(opts.skip);
        if (opts.top)
          this.top(opts.top);
      }
      return this.get({ 
        headers: options && options.headers,
        params: options && options.params,
        reportProgress: options && options.reportProgress,
        responseType: 'entityset', 
        withCredentials: options && options.reportProgress});
    }
    return fetch()
      .pipe(
        expand(([_, odata]) => (odata.skip || odata.skiptoken) ? fetch(odata) : empty()),
        concatMap(([entities, _]) => entities),
        toArray());
  }
}
