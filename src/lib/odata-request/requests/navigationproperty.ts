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
import { Schema } from '../../schema';
import { Types } from '../../utils/types';

export class ODataNavigationPropertyRequest<T> extends ODataRequest<T> {
  // Factory
  static factory<E>(name: string, client: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      schema?: Schema<E>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let schema = opts && opts.schema || new Schema<E>();

    segments.segment(Segments.navigationProperty, name);
    options.keep(Options.format);
    return new ODataNavigationPropertyRequest<E>(client, segments, options, schema);
  }

  // Key
  key(opts?: EntityKey) {
    let segment = this.segments.last();
    //TODO: Que pasa cuando el schema no es tal
    let key = (Types.isObject(opts) && this.schema) ? this.schema.resolveKey(opts as PlainObject) : opts;
    return segment.option(Options.key, opts);
  }

  // Segments
  ref() {
    return ODataRefRequest.factory(
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      schema: this.schema
    });
  }

  entity(opts?: EntityKey) {
    this.key(opts);
    return this;
  }

  navigationProperty<N>(name: string) {
    return ODataNavigationPropertyRequest.factory<N>(
      name, 
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      schema: this.schema.schemaForField<N>(name)
    });
  }

  property<P>(name: string) {
    return ODataPropertyRequest.factory<P>(
      name, 
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      schema: this.schema.schemaForField<P>(name)
    });
  }

  count() {
    return ODataCountRequest.factory(
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      schema: this.schema
    });
  }

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'entityset',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<ODataEntitySet<T>>;

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'entity'|'entityset'|'property',
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
