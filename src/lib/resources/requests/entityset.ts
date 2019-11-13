import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, empty } from 'rxjs';

import { Options, Expand, Select, Transform, Filter, GroupBy, OrderBy } from '../options';
import { ODataClient } from '../../client';
import { ODataSegments, Segments } from '../segments';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataOptions } from '../options';
import { ODataEntityResource } from './entity';
import { ODataCountResource } from './count';
import { EntityKey, PlainObject } from '../../types';
import { ODataResource } from '../resource';
import { Schema, Parser } from '../../schema';
import { expand, concatMap, toArray, map } from 'rxjs/operators';
import { ODataCollection } from '../responses/collection';
import { ODataEntitySet } from '../responses';
import { Types } from '../../utils';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  // Factory
  static factory<E>(name: string, service: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      parser?: Parser<E>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || new Schema<E>();

    segments.segment(Segments.entitySet, name);
    options.keep(Options.filter, Options.orderBy, Options.skip, Options.transform, Options.top, Options.search, Options.format);
    return new ODataEntitySetResource<E>(service, segments, options, parser);
  }

  // Segments
  entity(key?: EntityKey) {
    let entity = ODataEntityResource.factory<T>(
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser
    });
    if (!Types.isEmpty(key)) {
      entity.key(key);
    }
    return entity;
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

  count() {
    return ODataCountResource.factory(
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser
    });
  }

  // Client requests
  post(entity: T, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.post(this.serialize(entity), {
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

  // Custom
  all(): Observable<T[]> {
    let query = this.clone<T>() as ODataEntitySetResource<T>;
    let fetch = (options?: { skip?: number, skiptoken?: string, top?: number }) => {
      if (options) {
        if (options.skiptoken)
          query.skiptoken(options.skiptoken);
        else if (options.skip)
          query.skip(options.skip);
        if (options.top)
          query.top(options.top);
      }
      return query.get();
    }
    return fetch()
      .pipe(
        expand((resp: ODataEntitySet<T>) => (resp.skip || resp.skiptoken) ? fetch(resp) : empty()),
        concatMap((resp: ODataEntitySet<T>) => resp.value),
        toArray());
  }

  collection(size?: number): Observable<ODataCollection<T>> {
    let query = this.clone<T>() as ODataEntitySetResource<T>;
    size = size || this.client.maxSize;
    if (size)
      query.top(size);
    return query
      .get({ withCount: true })
      .pipe(map(entityset => new ODataCollection<T>(entityset, query)));
  }
}
