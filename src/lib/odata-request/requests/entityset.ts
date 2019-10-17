import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Segments, Options, Expand, Select, Transform, EntityKey, Filter, GroupBy, OrderBy, PlainObject } from '../types';
import { ODataClient } from '../../client';
import { ODataSegments } from '../segments';

import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { ODataOptions } from '../options';
import { ODataEntityRequest } from './entity';
import { ODataCountRequest } from './count';
import { ODataEntitySet } from '../../odata-response';
import { ODataRequest } from '../request';

export class ODataEntitySetRequest<T> extends ODataRequest<T> {
  // Factory
  static factory<E>(name: string, service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.entitySet, name);
    options.keep(Options.filter, Options.orderBy, Options.skip, Options.transform, Options.top, Options.search, Options.format);
    return new ODataEntitySetRequest<E>(service, segments, options);
  }

  // Segments
  entity(key?: EntityKey) {
    let entity = ODataEntityRequest.factory<T>(
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
    if (key)
      entity.key(key);
    entity.schema = this.schema;
    return entity;
  }

  action<A>(name: string) {
    return ODataActionRequest.factory<A>(
      name, 
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  function<F>(name: string) {
    return ODataFunctionRequest.factory<F>(
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

  post(body: T, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
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

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
    withCount?: boolean
  }): Observable<ODataEntitySet<T>> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entityset',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials,
      withCount: options && options.withCount
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
