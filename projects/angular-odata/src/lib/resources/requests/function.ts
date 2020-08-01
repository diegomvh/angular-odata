import { Observable } from 'rxjs';

import { ODataClient } from '../../client';

import { ODataPathSegments, PathSegmentNames, SegmentOptionNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpOptions } from '../http-options';

import { Types } from '../../utils/types';
import { EntityKey } from '../../types';
import { Select, Expand, Transform, Filter, OrderBy, PlainObject } from '../builder';
import { ODataResource } from '../resource';
import { map } from 'rxjs/operators';
import { ODataEntity, ODataEntities, ODataProperty } from '../response';
import { ODataCallableConfig } from '../../models/config';
import { ODataEntityParser } from '../../parsers/entity';

export class ODataFunctionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(client: ODataClient, path: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.function, path).setType(type);
    options.clear();
    return new ODataFunctionResource<P, R>(client, segments, options);
  }

  clone() {
    return super.clone<ODataFunctionResource<P, R>>();
  }
  //#endregion

  config() {
    return super.config() as ODataCallableConfig<R>;
  }

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
      },
      parameters(params?: P) {
        let segment = segments.segment(PathSegmentNames.function);
        if (!segment)
          throw new Error(`FunctionResource dosn't have segment for function`);
        if (!Types.isUndefined(params)) {
          segment.option(SegmentOptionNames.parameters, res.serialize(params));
        }
        return segment.option(SegmentOptionNames.parameters).value();
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
  get(options: HttpEntityOptions): Observable<ODataEntity<R>>;
  get(options: HttpEntitiesOptions): Observable<ODataEntities<R>>;
  get(options: HttpPropertyOptions): Observable<ODataProperty<R>>;
  get(options: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Custom 
  call(params: P | null, responseType: 'entity', options?: HttpOptions): Observable<R>;
  call(params: P | null, responseType: 'entities', options?: HttpOptions): Observable<R[]>;
  call(params: P | null, responseType: 'property', options?: HttpOptions): Observable<R>;
  call(
    params: P | null, 
    responseType: 'property' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any> {
    const res = this.clone();
    if (params)
      res.segment.parameters(params);
    const res$ = res.get(
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
