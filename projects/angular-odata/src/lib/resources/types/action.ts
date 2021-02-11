import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpOptions } from './options';
import { ODataProperty, ODataEntities, ODataEntity, ODataEntityMeta, ODataEntitiesMeta } from '../responses';
import { ODataApi } from '../../api';
import { map } from 'rxjs/operators';
import { ODataCollection, ODataModel } from '../../models';
import { ODataEntityResource } from './entity';
import { Expand, Filter, OrderBy, PlainObject, Select, Transform } from '../builder';
import { ODataEntitySetResource } from './entity-set';
import { ODataStructuredType } from '../../schema/structured-type';
import { ODataResource } from '../resource';

export class ODataActionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(api: ODataApi, path: string, type: string | undefined, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.add(PathSegmentNames.action, path)
    if (type)
      segment.type(type);
    options.clear();
    return new ODataActionResource<P, R>(api, segments, options);
  }

  clone() {
    return new ODataActionResource<P, R>(this.api, this.pathSegments.clone(), this.queryOptions.clone());
  }
  //#endregion

  asModel<M extends ODataModel<R>>(entity: Partial<R>, meta?: ODataEntityMeta): M {
    let resource: ODataEntityResource<R> | undefined;
    // TODO: Structured Only?
    let schema: ODataStructuredType<R> | undefined;
    let type = meta?.type || this.returnType();
    if (type !== undefined) {
      schema = this.api.findStructuredTypeForType(type);
    }
    let Model = schema?.model || ODataModel;
    let path = meta?.context.entitySet;
    if (path !== undefined) {
      resource = ODataEntitySetResource.factory<R>(this.api, path, type, new ODataPathSegments(), new ODataQueryOptions())
        .entity(entity);
    }
    return new Model(entity, {resource, schema, meta}) as M;
  }

  asCollection<M extends ODataModel<R>, C extends ODataCollection<R, M>>(entities: Partial<R>[], meta?: ODataEntitiesMeta): C {
    let resource: ODataEntitySetResource<R> | undefined;
    // TODO: Structured Only?
    let schema: ODataStructuredType<R> | undefined;
    let type = meta?.type || this.returnType();
    if (type !== undefined) {
      schema = this.api.findStructuredTypeForType(type);
    }
    let Collection = schema?.collection || ODataCollection;
    let path = meta?.context.entitySet;
    if (path !== undefined) {
      resource = ODataEntitySetResource.factory<R>(this.api, path, type, new ODataPathSegments(), new ODataQueryOptions());
    }
    return new Collection(entities, {resource, schema, meta}) as C;
  }

  //#region Action Config
  get schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findCallableForType<R>(type) :
      undefined;
  }
  //#endregion

  returnType() {
    return this.schema?.parser.return?.type;
  }

  //#region Mutable Resource
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
  //#region Mutable Resource
  get segment() {
    const segments = this.pathSegments;
    return {
      entitySet() {
        return segments.get(PathSegmentNames.entitySet);
      },
      singleton() {
        return segments.get(PathSegmentNames.singleton);
      },
      action() {
        return segments.get(PathSegmentNames.action);
      }
    }
  }
  //#endregion

  //#region Requests
  post(params: P | null, options?: HttpEntityOptions): Observable<ODataEntity<R>>;
  post(params: P | null, options?: HttpEntitiesOptions): Observable<ODataEntities<R>>;
  post(params: P | null, options?: HttpPropertyOptions): Observable<ODataProperty<R>>;
  post(params: P | null, options?: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions): Observable<any> {
    return super.post(params, options);
  }
  //#endregion

  //#region Custom
  call(params: P | null, options?: HttpOptions): Observable<any> {
    return this.clone().post(params, options) as Observable<any>;
  }

  callProperty(params: P | null, options: HttpOptions = {}): Observable<R | null> {
    const res = this.clone();
    const opts = Object.assign(<HttpPropertyOptions>{responseType: 'property'}, options);
    return res.post(params, opts).pipe(map(({property}) => property));
  }

  callEntity(params: P | null, options: HttpOptions = {}): Observable<R | null> {
    const res = this.clone();
    const opts = Object.assign(<HttpEntityOptions>{responseType: 'entity'}, options);
    return res.post(params, opts).pipe(map(({entity}) => entity));
  }

  callEntities(params: P | null, options: HttpOptions = {}): Observable<R[] | null> {
    const res = this.clone();
    const opts = Object.assign(<HttpEntitiesOptions>{responseType: 'entities'}, options);
    return res.post(params, opts).pipe(map(({entities}) => entities));
  }

  callCollection(params: P | null, options: HttpOptions = {}): Observable<ODataCollection<R, ODataModel<R>> | null> {
    const res = this.clone();
    const opts = Object.assign(<HttpEntitiesOptions>{responseType: 'entities'}, options);
    return res.post(params, opts).pipe(map(({entities, meta}) => entities ? this.asCollection(entities, meta) : null));
  }

  callModel(params: P | null, options: HttpOptions = {}): Observable<ODataModel<R> | null> {
    const res = this.clone();
    const opts = Object.assign(<HttpEntityOptions>{responseType: 'entity'}, options);
    return res.post(params, opts).pipe(map(({entity, meta}) => entity ? this.asModel(entity, meta) : null));
  }
  //#endregion
}
