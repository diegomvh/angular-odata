import { ODataRequest } from '../request';
import { Segments, Options, Select, Expand, Transform, Filter, OrderBy, GroupBy, PlainObject, EntityKey } from '../types';

import { ODataRefRequest } from './ref';
import { ODataOptions } from '../options';
import { ODataSegments } from '../segments';
import { ODataClient } from '../../client';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ODataEntitySet } from '../../odata-response';
import { ODataCountRequest } from './count';
import { ODataPropertyRequest } from './property';

export class ODataNavigationPropertyRequest<T> extends ODataRequest {
  // Factory
  static factory<T>(name: string, service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.navigationProperty, name);
    options.keep(Options.format);
    return new ODataNavigationPropertyRequest<T>(service, segments, options);
  }

  // Key
  key(opts?: EntityKey) {
    let segment = this.segments.last();
    return segment.option(Options.key, opts);
  }

  // Segments
  ref() {
    return ODataRefRequest.factory(
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  entity(opts?: EntityKey) {
    this.key(opts);
    return this;
  }

  navigationProperty<N>(name: string) {
    return ODataNavigationPropertyRequest.factory<N>(
      name, 
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  property<P>(name: string) {
    return ODataPropertyRequest.factory<P>(
      name, 
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  count() {
    return ODataCountRequest.factory(
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<ODataEntitySet<T>>;

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'entity'|'entityset'|'property',
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
}
