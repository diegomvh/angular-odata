import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames, SegmentOptionNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataClient } from '../../client';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpOptions } from '../http-options';
import { ODataProperty, ODataEntities, ODataEntity } from '../responses/index';
import { ODataResource } from '../resource';
import { Types } from '../../utils/types';
import { EntityKey } from '../../types';
import { ODataEntityParser } from '../../parsers';
import { Select, Expand, Transform, Filter, OrderBy, PlainObject } from '../builder';
import { map } from 'rxjs/operators';

export class ODataActionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(client: ODataClient, typeOrPath: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    const config = client.callableConfigForType<R>(typeOrPath);
    const path = config ? config.path : typeOrPath;
    segments.segment(PathSegmentNames.action, path).setType(typeOrPath);
    options.clear();
    return new ODataActionResource<P, R>(client, segments, options);
  }

  clone() {
    return super.clone<ODataActionResource<P, R>>();
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const res = this;
    const client = this.client;
    const segments = this.pathSegments;
    return {
      entitySet(name?: string) {
        let segment = segments.segment(PathSegmentNames.entitySet);
        if (!segment)
          throw new Error(`CallableResource dosn't have segment for entitySet`);
        if (!Types.isUndefined(name))
          segment.setPath(name);
        return segment.path;
      },
      key<E>(key?: EntityKey<E>) {
        let segment = segments.segment(PathSegmentNames.entitySet);
        if (!segment)
          throw new Error(`CallableResource dosn't have segment for key`);
        if (!Types.isUndefined(key)) {
          let parser = client.parserFor<E>(res);
          if (parser instanceof ODataEntityParser && Types.isObject(key))
            key = parser.resolveKey(key);
          segment.option(SegmentOptionNames.key, key);
        }
        return segment.option(SegmentOptionNames.key).value();
      }
    }
  }

  get query() {
    const options = this.queryOptions;
    return {
      select(opts?: Select<R>) {
        return options.option<Select<R>>(QueryOptionNames.select, opts);
      },
      expand(opts?: Expand<R>) {
        return options.option<Expand<R>>(QueryOptionNames.expand, opts);
      },
      transform(opts?: Transform<R>) {
        return options.option<Transform<R>>(QueryOptionNames.transform, opts);
      },
      search(opts?: string) {
        return options.option<string>(QueryOptionNames.search, opts);
      },
      filter(opts?: Filter) {
        return options.option<Filter>(QueryOptionNames.filter, opts);
      },
      orderBy(opts?: OrderBy<R>) {
        return options.option<OrderBy<R>>(QueryOptionNames.orderBy, opts);
      },
      format(opts?: string) {
        return options.option<string>(QueryOptionNames.format, opts);
      },
      top(opts?: number) {
        return options.option<number>(QueryOptionNames.top, opts);
      },
      skip(opts?: number) {
        return options.option<number>(QueryOptionNames.skip, opts);
      },
      skiptoken(opts?: string) {
        return options.option<string>(QueryOptionNames.skiptoken, opts);
      },
      custom(opts?: PlainObject) {
        return options.option<PlainObject>(QueryOptionNames.custom, opts);
      }
    }
  }
  //#endregion

  //#region Requests
  post(body: P | null, options: HttpEntityOptions): Observable<ODataEntity<R>>;
  post(body: P | null, options: HttpEntitiesOptions): Observable<ODataEntities<R>>;
  post(body: P | null, options: HttpPropertyOptions): Observable<ODataProperty<R>>;
  post(body: P | null, options: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions): Observable<any> {
    return super.post(body, options);
  }
  //#endregion

  //#region Custom 
  call(params: P | null, responseType?: 'entity', options?: HttpOptions): Observable<R>;
  call(params: P | null, responseType?: 'entities', options?: HttpOptions): Observable<R[]>;
  call(params: P | null, responseType?: 'property', options?: HttpOptions): Observable<R>;
  call(
    params: P | null, 
    responseType?: 'property' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any> {
    const res = this.clone();
    const res$ = res.post(params,
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{ responseType }, options || {})
    );
    switch(responseType) {
      case 'entities':
        return res$.pipe(map((res: ODataEntities<R>) => res.entities));
      case 'entity':
        return res$.pipe(map((res: ODataEntity<R>) => res.entity));
      case 'property':
        return res$.pipe(map((res: ODataProperty<R>) => res.property));
      default:
        return res$;
    }
  }
  //#endregion
}
