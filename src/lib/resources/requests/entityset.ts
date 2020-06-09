import { Observable, empty } from 'rxjs';

import { Expand, Select, Transform, Filter, OrderBy } from '../builder';
import { QueryOptionNames } from '../query-options';
import { ODataClient } from '../../client';
import { ODataPathSegments, SegmentNames } from '../path-segments';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataQueryOptions } from '../query-options';
import { ODataEntityResource } from './entity';
import { ODataCountResource } from './count';
import { EntityKey } from '../../types';
import { ODataResource } from '../resource';
import { expand, concatMap, toArray } from 'rxjs/operators';
import { Types } from '../../utils';
import { ODataEntityAnnotations, ODataEntitiesAnnotations } from '../responses';
import { HttpOptions, HttpEntityOptions, HttpEntitiesOptions } from '../http-options';
import { ODataModel } from '../../models';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  // Factory
  static factory<E>(client: ODataClient, name: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(SegmentNames.entitySet, name).setType(type);
    options.keep(QueryOptionNames.filter, QueryOptionNames.orderBy, QueryOptionNames.skip, QueryOptionNames.transform, QueryOptionNames.top, QueryOptionNames.search, QueryOptionNames.format);
    return new ODataEntitySetResource<E>(client, segments, options);
  }

  toModel<M extends ODataModel<T>>(body: any): M {
    return this.entity(body).toModel(body);
  }

  // EntitySet
  entitySet(name?: string) {
    let segment = this.pathSegments.segment(SegmentNames.entitySet);
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for entitySet`);
    if (!Types.isUndefined(name))
      segment.setPath(name);
    return segment.path;
  }

  entity(key?: EntityKey<T>) {
    let entity = ODataEntityResource.factory<T>(this.client, this.pathSegments.clone(), this.queryOptions.clone());
    if (!Types.isEmpty(key)) {
      entity.key(key);
    }
    return entity;
  }

  cast<C extends T>(type: string) {
    let entitySet =  new ODataEntitySetResource<C>(
      this.client, 
      this.pathSegments.clone(),
      this.queryOptions.clone()
    );
    entitySet.pathSegments.segment(SegmentNames.type, type).setType(type);
    return entitySet;
  }

  action<A>(name: string, type?: string) {
    return ODataActionResource.factory<A>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  function<F>(name: string, type?: string) {
    return ODataFunctionResource.factory<F>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  count() {
    return ODataCountResource.factory(this.client, this.pathSegments.clone(), this.queryOptions.clone());
  }

  // Client requests
  post(entity: Partial<T>, options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return super.post(this.serialize(entity),
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  get(options?: HttpOptions & { withCount?: boolean }): Observable<[T[], ODataEntitiesAnnotations]> {
    return super.get(
      Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
    );
  }

  // Query
  select(opts?: Select<T>) {
    return this.queryOptions.option<Select<T>>(QueryOptionNames.select, opts);
  }

  expand(opts?: Expand<T>) {
    return this.queryOptions.option<Expand<T>>(QueryOptionNames.expand, opts);
  }

  transform(opts?: Transform<T>) {
    return this.queryOptions.option<Transform<T>>(QueryOptionNames.transform, opts);
  }

  search(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionNames.search, opts);
  }

  filter(opts?: Filter) {
    return this.queryOptions.option(QueryOptionNames.filter, opts);
  }

  orderBy(opts?: OrderBy<T>) {
    return this.queryOptions.option(QueryOptionNames.orderBy, opts);
  }

  format(opts?: string) {
    return this.queryOptions.option(QueryOptionNames.format, opts);
  }

  top(opts?: number) {
    return this.queryOptions.option(QueryOptionNames.top, opts);
  }

  skip(opts?: number) {
    return this.queryOptions.option(QueryOptionNames.skip, opts);
  }

  skiptoken(opts?: string) {
    return this.queryOptions.option(QueryOptionNames.skiptoken, opts);
  }
  
  // Custom
  all(options?: HttpOptions): Observable<T[]> {
    let res = this.clone() as ODataEntitySetResource<T>;
    let fetch = (opts?: { skip?: number, skiptoken?: string, top?: number }) => {
      if (opts) {
        if (opts.skiptoken)
          res.skiptoken(opts.skiptoken);
        else if (opts.skip)
          res.skip(opts.skip);
        if (opts.top)
          res.top(opts.top);
      }
      return res.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
      );
    }
    return fetch()
      .pipe(
        expand(([_, annots])  => (annots.skip || annots.skiptoken) ? fetch(annots) : empty()),
        concatMap(([entities, _]) => entities),
        toArray());
  }
}
