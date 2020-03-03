import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, empty } from 'rxjs';

import { QueryOptionTypes, Expand, Select, Transform, Filter, GroupBy, OrderBy } from '../options';
import { ODataClient } from '../../client';
import { ODataPathSegments, SegmentTypes } from '../segments';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataQueryOptions } from '../options';
import { ODataEntityResource } from './entity';
import { ODataCountResource } from './count';
import { EntityKey, PlainObject, $COUNT } from '../../types';
import { ODataResource } from '../resource';
import { Parser } from '../../models';
import { expand, concatMap, toArray, map } from 'rxjs/operators';
import { Types } from '../../utils';
import { ODataEntityAnnotations, ODataCollectionAnnotations, ODataAnnotations } from '../responses';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  // Factory
  static factory<E>(name: string, service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parser?: Parser<E>}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.entitySet, name);
    options.keep(QueryOptionTypes.filter, QueryOptionTypes.orderBy, QueryOptionTypes.skip, QueryOptionTypes.transform, QueryOptionTypes.top, QueryOptionTypes.search, QueryOptionTypes.format);
    return new ODataEntitySetResource<E>(service, segments, options, parser);
  }

  // Segments
  entity(key?: EntityKey<T>, annots?: ODataAnnotations) {
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
  }): Observable<[T, ODataEntityAnnotations]> {
    return this.client.post<T>(this, this.serialize(entity), {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.toEntity(body)));
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
    withCount?: boolean
  }): Observable<[T[], ODataCollectionAnnotations]> {

    let params = options && options.params;
    if (options && options.withCount)
      params = this.client.mergeHttpParams(params, {[$COUNT]: 'true'})

    return this.client.get<T>(this, {
      headers: options && options.headers,
      observe: 'body',
      params: params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.toEntities(body)));
  }

  // Options
  select(opts?: Select<T>) {
    return this.options.option<Select<T>>(QueryOptionTypes.select, opts);
  }

  expand(opts?: Expand<T>) {
    return this.options.option<Expand<T>>(QueryOptionTypes.expand, opts);
  }

  transform(opts?: Transform<T>) {
    return this.options.option<Transform<T>>(QueryOptionTypes.transform, opts);
  }

  search(opts?: string) {
    return this.options.option<string>(QueryOptionTypes.search, opts);
  }

  filter(opts?: Filter) {
    return this.options.option<Filter>(QueryOptionTypes.filter, opts);
  }

  groupBy(opts?: GroupBy<T>) {
    return this.options.option(QueryOptionTypes.groupBy, opts);
  }

  orderBy(opts?: OrderBy<T>) {
    return this.options.option<OrderBy<T>>(QueryOptionTypes.orderBy, opts);
  }

  format(opts?: string) {
    return this.options.option<string>(QueryOptionTypes.format, opts);
  }

  top(opts?: number) {
    return this.options.option<number>(QueryOptionTypes.top, opts);
  }

  skip(opts?: number) {
    return this.options.option<number>(QueryOptionTypes.skip, opts);
  }

  skiptoken(opts?: string) {
    return this.options.option<string>(QueryOptionTypes.skiptoken, opts);
  }
  
  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(QueryOptionTypes.custom, opts);
  }

  // Custom
  all(): Observable<T[]> {
    let res = this.clone() as ODataEntitySetResource<T>;
    let fetch = (options?: { skip?: number, skiptoken?: string, top?: number }) => {
      if (options) {
        if (options.skiptoken)
          res.skiptoken(options.skiptoken);
        else if (options.skip)
          res.skip(options.skip);
        if (options.top)
          res.top(options.top);
      }
      return res.get();
    }
    return fetch()
      .pipe(
        expand(([_, odata])  => (odata.skip || odata.skiptoken) ? fetch(odata) : empty()),
        concatMap(([entities, _]) => entities),
        toArray());
  }
}
