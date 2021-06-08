import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpOptions, HttpNoneOptions } from './options';
import { ODataProperty, ODataEntities, ODataEntity, ODataEntityAnnotations, ODataEntitiesAnnotations } from '../responses';
import { ODataApi } from '../../api';
import { map } from 'rxjs/operators';
import { ODataCollection, ODataModel } from '../../models';
import { ODataEntityResource } from './entity';
import { Expand, Filter, OrderBy, Select, Transform } from '../builder';
import { ODataEntitySetResource } from './entity-set';
import { ODataStructuredType } from '../../schema/structured-type';
import { ODataResource } from '../resource';

export class ODataActionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(api: ODataApi, path: string, type: string | undefined, segments: ODataPathSegments, query: ODataQueryOptions) {
    const segment = segments.add(PathSegmentNames.action, path)
    if (type)
      segment.type(type);
    query.clear();
    return new ODataActionResource<P, R>(api, segments, query);
  }

  clone() {
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), this.cloneQuery());
  }
  //#endregion

  asModel<M extends ODataModel<R>>(entity: Partial<R> | {[name: string]: any}, {annots, reset}: { annots?: ODataEntityAnnotations, reset?:boolean} = {}): M {
    let resource: ODataEntityResource<R> | undefined;
    // TODO: Structured Only?
    let schema: ODataStructuredType<R> | undefined;
    let type = annots?.type || this.returnType();
    if (type !== undefined) {
      schema = this.api.findStructuredTypeForType(type);
    }
    let Model = schema?.model || ODataModel;
    let path = annots?.context.entitySet;
    if (path !== undefined) {
      resource = ODataEntitySetResource.factory<R>(this.api, path, type, new ODataPathSegments(), this.cloneQuery())
        .entity(entity as Partial<R>);
    }
    return new Model(entity, {resource, annots, reset}) as M;
  }

  asCollection<M extends ODataModel<R>, C extends ODataCollection<R, M>>(
    entities: Partial<R>[] | {[name: string]: any}[],
    {annots, reset}: { annots?: ODataEntitiesAnnotations, reset?: boolean} = {}
  ): C {
    let resource: ODataEntitySetResource<R> | undefined;
    // TODO: Structured Only?
    let schema: ODataStructuredType<R> | undefined;
    let type = annots?.type || this.returnType();
    if (type !== undefined) {
      schema = this.api.findStructuredTypeForType(type);
    }
    let Collection = schema?.collection || ODataCollection;
    let path = annots?.context.entitySet;
    if (path !== undefined) {
      resource = ODataEntitySetResource.factory<R>(this.api, path, type, new ODataPathSegments(), this.cloneQuery());
    }
    return new Collection(entities, {resource, annots, reset}) as C;
  }

  //#region Action Config
  get schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findCallableForType<R>(type) :
      undefined;
  }
  returnType() {
    return this.schema?.parser.return?.type;
  }

  //#endregion

  //#region Inmutable Resource
  select(opts: Select<R>) {
    let options = this.cloneQuery();
    options.option<Select<R>>(QueryOptionNames.select, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }

  expand(opts: Expand<R>) {
    let options = this.cloneQuery();
    options.option<Expand<R>>(QueryOptionNames.expand, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }

  transform(opts: Transform<R>) {
    let options = this.cloneQuery();
    options.option<Transform<R>>(QueryOptionNames.transform, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }

  search(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.search, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }

  filter(opts: Filter) {
    let options = this.cloneQuery();
    options.option<Filter>(QueryOptionNames.filter, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }

  orderBy(opts: OrderBy<R>) {
    let options = this.cloneQuery();
    options.option<OrderBy<R>>(QueryOptionNames.orderBy, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }

  format(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }

  top(opts: number) {
    let options = this.cloneQuery();
    options.option<number>(QueryOptionNames.top, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }

  skip(opts: number) {
    let options = this.cloneQuery();
    options.option<number>(QueryOptionNames.skip, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }

  skiptoken(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.skiptoken, opts);
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), options);
  }
  //#endregion

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
      }
    }
  }

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

  //#region Shortcuts
  call(params: P | null, options?: HttpEntityOptions & HttpOptions): Observable<ODataEntity<R>>;
  call(params: P | null, options?: HttpEntitiesOptions & HttpOptions): Observable<ODataEntities<R>>;
  call(params: P | null, options?: HttpPropertyOptions & HttpOptions): Observable<ODataProperty<R>>;
  call(params: P | null, options?: HttpNoneOptions & HttpOptions): Observable<null>;
  call(params: P | null, options: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions & HttpNoneOptions & HttpOptions = {}): Observable<any> {
    return this.clone().post(params, options);
  }
  callProperty(params: P | null, options: HttpOptions = {}): Observable<R | null> {
    return this.call(params, {responseType: 'property', ...options}).pipe(map(({property}) => property));
  }

  callEntity(params: P | null, options: HttpOptions = {}): Observable<R | null> {
    return this.call(params, {responseType: 'entity', ...options}).pipe(map(({entity}) => entity));
  }

  callModel(params: P | null, options: HttpOptions = {}): Observable<ODataModel<R> | null> {
    return this.call(params, {responseType: 'entity', ...options}).pipe(map(({entity, annots}) => entity ? this.asModel(entity, {annots, reset: true}) : null));
  }

  callEntities(params: P | null, options: HttpOptions = {}): Observable<R[] | null> {
    return this.call(params, {responseType: 'entities', ...options}).pipe(map(({entities}) => entities));
  }

  callCollection(params: P | null, options: HttpOptions = {}): Observable<ODataCollection<R, ODataModel<R>> | null> {
    return this.call(params, {responseType: 'entities', ...options}).pipe(map(({entities, annots}) => entities ? this.asCollection(entities, {annots, reset: true}) : null));
  }
  //#endregion
}
