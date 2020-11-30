import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataClient } from '../../client';

import { ODataPathSegments, PathSegmentNames, SegmentOptionNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpOptions } from './options';

import { Types } from '../../utils/types';
import { EntityKey } from '../../types';
import { Select, Expand, Transform, Filter, OrderBy, PlainObject } from '../builder';
import { ODataResource } from '../resource';
import { ODataEntity, ODataEntities, ODataProperty } from '../responses';
import { ODataEntityParser } from '../../parsers/entity';
import { ODataModel, ODataCollection } from '../../models';

export class ODataFunctionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(client: ODataClient, path: string, type: string | null, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.segment(PathSegmentNames.function, path);
    if (type)
      segment.setType(type);
    options.clear();
    return new ODataFunctionResource<P, R>(client, segments, options);
  }

  clone() {
    return new ODataFunctionResource<P, R>(this.client, this.pathSegments.clone(), this.queryOptions.clone());
  }
  //#endregion

  //#region Action Config
  get schema() {
    let type = this.type();
    if (type === null) return null;
    return this.client.callableForType<R>(type);
  }
  ////#endregion

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
        if (name !== undefined)
          segment.setPath(name);
        return segment;
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
        return segment.option(SegmentOptionNames.key);
      },
      parameters(params?: P) {
        let segment = segments.segment(PathSegmentNames.function);
        if (!segment)
          throw new Error(`FunctionResource dosn't have segment for function`);
        if (!Types.isUndefined(params)) {
          segment.option(SegmentOptionNames.parameters, res.serialize(params));
        }
        return segment.option(SegmentOptionNames.parameters);
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
  call(params: P | null, responseType: 'model', options?: HttpOptions): Observable<ODataModel<R>>;
  call(params: P | null, responseType: 'collection', options?: HttpOptions): Observable<ODataCollection<R, ODataModel<R>>>;
  call(
    params: P | null,
    responseType: 'property' | 'entity' | 'model' | 'entities' | 'collection',
    options?: HttpOptions
  ): Observable<any> {
    const res = this.clone() as ODataFunctionResource<P, R>;
    if (params)
      res.segment.parameters(params);
    const res$ = res.get(
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{ responseType }, options || {})
    ) as Observable<any>;
    switch(responseType) {
      case 'entities':
        return (res$ as Observable<ODataEntities<R>>).pipe(map(({entities}) => entities));
      case 'collection':
        return (res$ as Observable<ODataEntities<R>>).pipe(map(({entities, meta}) => res.asCollection(entities || [], meta)));
      case 'entity':
        return (res$ as Observable<ODataEntity<R>>).pipe(map(({entity}) => entity));
      case 'model':
        return (res$ as Observable<ODataEntity<R>>).pipe(map(({entity, meta}) => res.asModel(entity || {}, meta)));
      case 'property':
        return (res$ as Observable<ODataProperty<R>>).pipe(map(({property}) => property));
      default:
        return res$;
    }
  }
  //#endregion
}
