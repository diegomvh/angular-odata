import { ODataResource } from '../resource';
import { Expand, Select, Transform, Filter, OrderBy } from '../builder';
import { QueryOptionNames } from '../query-options';

import { ODataReferenceResource } from './reference';
import { ODataQueryOptions } from '../query-options';
import { ODataPathSegments, PathSegmentNames, SegmentOptionNames } from '../path-segments';
import { ODataClient } from '../../client';
import { Observable, empty } from 'rxjs';
import { EntityKey } from '../../types';
import { ODataCountResource } from './count';
import { ODataPropertyResource } from './property';
import { Types } from '../../utils/types';
import { expand, concatMap, toArray } from 'rxjs/operators';
import { ODataEntitiesAnnotations, ODataEntityAnnotations } from '../responses';
import { HttpEntityOptions, HttpEntitiesOptions, HttpOptions } from '../http-options';
import { ODataEntityParser } from '../../parsers';

export class ODataNavigationPropertyResource<T> extends ODataResource<T> {
  // Factory
  static factory<E>(client: ODataClient, name: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.navigationProperty, name).setType(type);
    options.keep(QueryOptionNames.format);
    return new ODataNavigationPropertyResource<E>(client, segments, options);
  }

  // Key
  key(key?: EntityKey<T>) {
    let segment = this.pathSegments.segment(PathSegmentNames.navigationProperty);
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for key`);
    if (!Types.isUndefined(key)) {
      if (this.parser instanceof ODataEntityParser && Types.isObject(key))
        key = this.parser.resolveKey(key);
      segment.option(SegmentOptionNames.key, key);
    }
    return segment.option(SegmentOptionNames.key).value();
  }

  hasKey() {
    return this.key() !== undefined;
  }

  // EntitySet
  entitySet(name?: string) {
    let segment = this.pathSegments.segment(PathSegmentNames.entitySet);
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for entitySet`);
    if (!Types.isUndefined(name))
      segment.setPath(name);
    return segment.path;
  }

  // Segments
  reference() {
    return ODataReferenceResource.factory(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone()
    });
  }

  navigationProperty<N>(name: string) {
    let type = this.parser instanceof ODataEntityParser? 
      this.parser.typeFor(name) : null; 
    return ODataNavigationPropertyResource.factory<N>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  property<P>(name: string) {
    let type = this.parser instanceof ODataEntityParser? 
      this.parser.typeFor(name) : null;
    return ODataPropertyResource.factory<P>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  count() {
    return ODataCountResource.factory(this.client, this.pathSegments.clone(), this.queryOptions.clone());
  }

  // Client requests
  get(options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;

  get(options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;

  get(options: HttpEntityOptions & HttpEntitiesOptions): Observable<any> {
    return super.get(options);
  }

  // Options
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
    return this.queryOptions.option<Filter>(QueryOptionNames.filter, opts);
  }

  orderBy(opts?: OrderBy<T>) {
    return this.queryOptions.option<OrderBy<T>>(QueryOptionNames.orderBy, opts);
  }

  format(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionNames.format, opts);
  }

  top(opts?: number) {
    return this.queryOptions.option<number>(QueryOptionNames.top, opts);
  }

  skip(opts?: number) {
    return this.queryOptions.option<number>(QueryOptionNames.skip, opts);
  }

  skiptoken(opts?: string) {
    return this.queryOptions.option<string>(QueryOptionNames.skiptoken, opts);
  }

  // Custom
  single(options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return this
      .get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
      );
  }

  collection(options?: HttpOptions & {withCount?: boolean}): Observable<[T[], ODataEntitiesAnnotations]> {
    return this
      .get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
      );
  }

  all(options?: HttpOptions): Observable<T[]> {
    let res = this.clone() as ODataNavigationPropertyResource<T>;
    let fetch = (opts?: { skip?: number, skiptoken?: string, top?: number }): Observable<[T[], ODataEntitiesAnnotations]> => {
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
        expand(([_, annots]) => (annots.skip || annots.skiptoken) ? fetch(annots) : empty()),
        concatMap(([entities, _]) => entities),
        toArray());
  }
}
