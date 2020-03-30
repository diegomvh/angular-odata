import { Observable, empty } from 'rxjs';

import { QueryOptionTypes, Expand, Select, Transform, Filter, GroupBy, OrderBy } from '../query-options';
import { ODataClient } from '../../client';
import { ODataPathSegments, SegmentTypes } from '../path-segments';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataQueryOptions } from '../query-options';
import { ODataEntityResource, ODataToEntityResource } from './entity';
import { ODataCountResource } from './count';
import { EntityKey, PlainObject, $COUNT } from '../../types';
import { ODataResource } from '../resource';
import { Parser } from '../../models';
import { expand, concatMap, toArray, map } from 'rxjs/operators';
import { Types } from '../../utils';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataAnnotations } from '../responses';
import { HttpOptions } from '../http-options';

export class ODataEntitySetResource<T> extends ODataResource<T> implements ODataToEntityResource<T>  {
  // Factory
  static factory<E>(name: string, client: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parser?: Parser<E>}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.entitySet, name);
    options.keep(QueryOptionTypes.filter, QueryOptionTypes.orderBy, QueryOptionTypes.skip, QueryOptionTypes.transform, QueryOptionTypes.top, QueryOptionTypes.search, QueryOptionTypes.format);
    return new ODataEntitySetResource<E>(client, segments, options, parser);
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

  entity(key?: EntityKey<T>, annots?: ODataAnnotations) {
    let entity = ODataEntityResource.factory<T>(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
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

  count() {
    return ODataCountResource.factory(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser
    });
  }

  // Client requests
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

  get(options?: HttpOptions & { withCount?: boolean }): Observable<[T[], ODataEntitiesAnnotations]> {

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

  // Query
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
    return this.queryOptions.option(QueryOptionTypes.filter, opts);
  }

  groupBy(opts?: GroupBy<T>) {
    return this.queryOptions.option(QueryOptionTypes.groupBy, opts);
  }

  orderBy(opts?: OrderBy<T>) {
    return this.queryOptions.option(QueryOptionTypes.orderBy, opts);
  }

  format(opts?: string) {
    return this.queryOptions.option(QueryOptionTypes.format, opts);
  }

  top(opts?: number) {
    return this.queryOptions.option(QueryOptionTypes.top, opts);
  }

  skip(opts?: number) {
    return this.queryOptions.option(QueryOptionTypes.skip, opts);
  }

  skiptoken(opts?: string) {
    return this.queryOptions.option(QueryOptionTypes.skiptoken, opts);
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
