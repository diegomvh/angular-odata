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
  //#endregion

  clone() {
    return new ODataActionResource<P, R>(this.api, this.cloneSegments(), this.cloneQuery());
  }

  schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findCallableForType<R>(type) :
      undefined;
  }

  returnType() {
    return this.schema()?.parser.return?.type;
  }

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

  //#region Inmutable Resource
  select(opts: Select<R>) {
    const clone = this.clone();
    clone.query.select(opts);
    return clone;
  }

  expand(opts: Expand<R>) {
    const clone = this.clone();
    clone.query.expand(opts);
    return clone;
  }

  transform(opts: Transform<R>) {
    const clone = this.clone();
    clone.query.transform(opts);
    return clone;
  }

  search(opts: string) {
    const clone = this.clone();
    clone.query.search(opts);
    return clone;
  }

  filter(opts: Filter) {
    const clone = this.clone();
    clone.query.filter(opts);
    return clone;
  }

  orderBy(opts: OrderBy<R>) {
    const clone = this.clone();
    clone.query.orderBy(opts);
    return clone;
  }

  format(opts: string) {
    const clone = this.clone();
    clone.query.format(opts);
    return clone;
  }

  top(opts: number) {
    const clone = this.clone();
    clone.query.top(opts);
    return clone;
  }

  skip(opts: number) {
    const clone = this.clone();
    clone.query.skip(opts);
    return clone;
  }

  skiptoken(opts: string) {
    const clone = this.clone();
    clone.query.skiptoken(opts);
    return clone;
  }
  //#endregion

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

  /**
   * Handle query options of the action
   * @returns Handler for mutate the query of the action
   */
  get query() {
    return this.entitiesQueryHandler();
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
