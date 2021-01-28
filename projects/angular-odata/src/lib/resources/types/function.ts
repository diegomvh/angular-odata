import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpOptions } from './options';

import { Select, Expand, Transform, Filter, OrderBy, PlainObject } from '../builder';
import { ODataResource } from '../resource';
import { ODataEntity, ODataEntities, ODataProperty, ODataEntityMeta, ODataEntitiesMeta } from '../responses';
import { ODataModel, ODataCollection } from '../../models';
import { ODataApi } from '../../api';
import { ODataEntitySetResource } from './entity-set';
import { ODataEntityResource } from './entity';
import { ODataStructuredType } from '../../schema/structured-type';

export class ODataFunctionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(api: ODataApi, path: string, type: string | undefined, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.add(PathSegmentNames.function, path);
    if (type)
      segment.type(type);
    options.clear();
    return new ODataFunctionResource<P, R>(api, segments, options);
  }

  clone() {
    return new ODataFunctionResource<P, R>(this.api, this.pathSegments.clone(), this.queryOptions.clone());
  }
  //#endregion
  returnType() {
    return this.schema?.parser.return;
  }

  asModel<M extends ODataModel<R>>(entity: Partial<R>, meta?: ODataEntityMeta): M {
    let Model = ODataModel;
    let type = this.returnType();
    if (type !== undefined) {
      Model = this.api.findModelForType(type) || ODataModel;
    }
    let options: { resource?: ODataEntityResource<R>, schema?: ODataStructuredType<R>, meta?: ODataEntityMeta } = { meta };
    let path = meta?.context.entitySet;
    if (path !== undefined) {
      options.resource = ODataEntitySetResource.factory<R>(this.api, path, type, new ODataPathSegments(), new ODataQueryOptions())
        .entity(entity);
    }
    type = meta?.context.type || type;
    if (type !== undefined) {
      options.schema = this.api.findStructuredTypeForType(type);
    }
    return new Model(entity, options) as M;
  }

  asCollection<M extends ODataModel<R>, C extends ODataCollection<R, M>>(entities: Partial<R>[], meta?: ODataEntitiesMeta): C {
    let Collection = ODataCollection;
    let type = this.returnType();
    if (type !== undefined) {
      Collection = this.api.findCollectionForType(type) || ODataCollection;
    }
    let options: { resource?: ODataEntitySetResource<R>, schema?: ODataStructuredType<R>, meta?: ODataEntitiesMeta } = { meta };
    let path = meta?.context.entitySet;
    if (path !== undefined) {
      options.resource = ODataEntitySetResource.factory<R>(this.api, path, type, new ODataPathSegments(), new ODataQueryOptions());
    }
    type = meta?.context.type || type;
    if (type !== undefined) {
      options.schema = this.api.findStructuredTypeForType(type);
    }
    return new Collection(entities, options) as C;
  }

  //#region Action Config
  get schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findCallableForType<R>(type) :
      undefined;
  }
  //#endregion

  //#region Inmutable Resource
  parameters(params: P | null) {
    let segments = this.pathSegments.clone();
    let segment = segments.get(PathSegmentNames.function);
    segment.parameters(params !== null ? this.serialize(params) : null);
    return new ODataFunctionResource<P, R>(this.api, segments, this.queryOptions.clone());
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const segments = this.pathSegments;
    return {
      entitySet() {
        return segments.get(PathSegmentNames.entitySet);
      },
      function() {
        return segments.get(PathSegmentNames.function);
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
    const res = this.parameters(params);
    const opts = responseType === 'model' ? Object.assign(<HttpEntityOptions>{responseType: 'entity'}, options || {}) :
      responseType === 'collection' ? Object.assign(<HttpEntitiesOptions>{responseType: 'entities'}, options || {}) :
      Object.assign(<HttpOptions>{responseType}, options || {});
    const res$ = res.get(opts) as Observable<any>;
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
