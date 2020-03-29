import { ODataResource } from '../resource';
import { QueryOptionTypes, Select, Expand, Transform, Filter, OrderBy, GroupBy } from '../query-options';

import { ODataReferenceResource } from './reference';
import { ODataQueryOptions } from '../query-options';
import { ODataPathSegments, SegmentTypes, SegmentOptionTypes } from '../path-segments';
import { ODataClient } from '../../client';
import { Observable, empty } from 'rxjs';
import { EntityKey, PlainObject, $COUNT } from '../../types';
import { ODataCountResource } from './count';
import { ODataPropertyResource } from './property';
import { Parser } from '../../models';
import { Types } from '../../utils/types';
import { expand, concatMap, toArray, map } from 'rxjs/operators';
import { ODataCollectionAnnotations, ODataEntityAnnotations, ODataAnnotations } from '../responses';
import { HttpEntityOptions, HttpEntitiesOptions, HttpOptions } from '../http-options';
import { ODataToEntityResource } from './entity';

export class ODataNavigationPropertyResource<T> extends ODataResource<T> implements ODataToEntityResource<T> {
  // Factory
  static factory<E>(name: string, client: ODataClient, opts?: {
    segments?: ODataPathSegments,
    options?: ODataQueryOptions,
    parser?: Parser<E>
  }
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.navigationProperty, name);
    options.keep(QueryOptionTypes.format);
    return new ODataNavigationPropertyResource<E>(client, segments, options, parser);
  }

  // Key
  key(key?: EntityKey<T>) {
    let segment = this.pathSegments.last();
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

  entity(key?: EntityKey<T>, annots?: ODataAnnotations) {
    this.key(key);
    return this;
  }

  // Segments
  reference() {
    return ODataReferenceResource.factory(
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

  count() {
    return ODataCountResource.factory(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser
    });
  }

  // Client requests
  get(options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;

  get(options: HttpEntitiesOptions): Observable<[T[], ODataCollectionAnnotations]>;

  get(options: HttpEntityOptions & HttpEntitiesOptions): Observable<any> {

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
        return res$.pipe(map((body: any) => this.toEntity(body)));
      case 'entities':
        return res$.pipe(map((body: any) => this.toEntities(body)));
    }
  }

  // Options
  select(opts?: Select<T>) {
    return this.queryOptions.option<Select<T>>(QueryOptionTypes.select, opts);
  }

  expand(opts?: Expand<T>) {
    return this.queryOptions.option<Expand<T>>(QueryOptionTypes.expand, opts);
  }

  transform(opts?: Transform<T>) {
    return this.queryOptions.option<Transform<T>>(QueryOptionTypes.transform, opts);
  }

  search(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionTypes.search, opts);
  }

  filter(opts?: Filter) {
    return this.queryOptions.option<Filter>(QueryOptionTypes.filter, opts);
  }

  groupBy(opts?: GroupBy<T>) {
    return this.queryOptions.option(QueryOptionTypes.groupBy, opts);
  }

  orderBy(opts?: OrderBy<T>) {
    return this.queryOptions.option<OrderBy<T>>(QueryOptionTypes.orderBy, opts);
  }

  format(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionTypes.format, opts);
  }

  top(opts?: number) {
    return this.queryOptions.option<number>(QueryOptionTypes.top, opts);
  }

  skip(opts?: number) {
    return this.queryOptions.option<number>(QueryOptionTypes.skip, opts);
  }

  skiptoken(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionTypes.skiptoken, opts);
  }

  custom(opts?: PlainObject) {
    return this.queryOptions.option<PlainObject>(QueryOptionTypes.custom, opts);
  }

  // Custom
  single(options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return this
      .get({ 
        headers: options && options.headers,
        params: options && options.params,
        responseType: 'entity', 
        reportProgress: options && options.reportProgress,
        withCredentials: options && options.withCredentials});
  }

  collection(options?: HttpOptions): Observable<[T[], ODataCollectionAnnotations]> {
    return this
      .get({ 
        headers: options && options.headers,
        params: options && options.params,
        responseType: 'entities', 
        reportProgress: options && options.reportProgress,
        withCredentials: options && options.withCredentials,
        withCount: true });
  }

  all(options?: HttpOptions): Observable<T[]> {
    let res = this.clone() as ODataNavigationPropertyResource<T>;
    let fetch = (opts?: { skip?: number, skiptoken?: string, top?: number }): Observable<[T[], ODataCollectionAnnotations]> => {
      if (opts) {
        if (opts.skiptoken)
          res.skiptoken(opts.skiptoken);
        else if (opts.skip)
          res.skip(opts.skip);
        if (opts.top)
          res.top(opts.top);
      }
      return res.get({ 
        headers: options && options.headers,
        params: options && options.params,
        reportProgress: options && options.reportProgress,
        responseType: 'entities', 
        withCredentials: options && options.withCredentials});
    }
    return fetch()
      .pipe(
        expand(([_, odata]) => (odata.skip || odata.skiptoken) ? fetch(odata) : empty()),
        concatMap(([entities, _]) => entities),
        toArray());
  }
}
