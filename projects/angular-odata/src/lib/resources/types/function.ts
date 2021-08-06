import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import {
  HttpEntityOptions,
  HttpEntitiesOptions,
  HttpPropertyOptions,
  HttpOptions,
  HttpNoneOptions,
} from './options';

import {
  ODataEntity,
  ODataEntities,
  ODataProperty,
  ODataEntityAnnotations,
  ODataEntitiesAnnotations,
} from '../responses';
import { ODataApi } from '../../api';
import { ODataCollection } from '../../models/collection';
import { ODataModel } from '../../models/model';
import { Expand, Filter, OrderBy, Select, Transform } from '../builder';
import { ODataEntitySetResource } from './entity-set';
import { ODataEntityResource } from './entity';
import { ODataStructuredType } from '../../schema';
import { ODataResource } from '../resource';
import { alias as functionAlias } from '../builder';

export class ODataFunctionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(
    api: ODataApi,
    path: string,
    type: string | undefined,
    segments: ODataPathSegments,
    options: ODataQueryOptions
  ) {
    const segment = segments.add(PathSegmentNames.function, path);
    if (type) segment.type(type);
    options.clear();
    return new ODataFunctionResource<P, R>(api, segments, options);
  }
  //#endregion

  returnType() {
    return this.schema()?.parser.return?.type;
  }
  clone() {
    return new ODataFunctionResource<P, R>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  schema() {
    //TODO: Binding Type
    let type = this.type();
    return type !== undefined
      ? this.api.findCallableForType<R>(type)
      : undefined;
  }

  serializer<E>() {
    const type = this.type();
    return type !== undefined
      ? this.api.findCallableForType<E>(type)?.parser
      : undefined;
  }

  deserializer<E>() {
    const type = this.returnType();
    return type !== undefined
      ? this.api.findCallableForType<E>(type)?.parser
      : undefined;
  }

  encoder<E>() {
    const type = this.type();
    return type !== undefined
      ? this.api.findCallableForType<E>(type)?.parser
      : undefined;
  }

  asModel<M extends ODataModel<R>>(
    entity: Partial<R> | { [name: string]: any },
    { annots, reset }: { annots?: ODataEntityAnnotations; reset?: boolean } = {}
  ): M {
    let resource: ODataEntityResource<R> | undefined;
    const type = annots?.type || this.returnType();
    const Model = this.api.modelForType(type);
    let path = annots?.context.entitySet;
    if (path !== undefined) {
      resource = this.api.entitySet<R>(path).entity(entity as Partial<R>);
      resource.query.apply(this.queryOptions.toQueryArguments());
    }
    return new Model(entity, { resource, annots, reset }) as M;
  }

  asCollection<M extends ODataModel<R>, C extends ODataCollection<R, M>>(
    entities: Partial<R>[] | { [name: string]: any }[],
    {
      annots,
      reset,
    }: { annots?: ODataEntitiesAnnotations; reset?: boolean } = {}
  ): C {
    let resource: ODataEntitySetResource<R> | undefined;
    const type = annots?.type || this.returnType();
    const Collection = this.api.collectionForType(type);
    let path = annots?.context.entitySet;
    if (path !== undefined) {
      resource = this.api.entitySet<R>(path);
      resource.query.apply(this.queryOptions.toQueryArguments());
    }
    return new Collection(entities, { resource, annots, reset }) as C;
  }

  //#region Inmutable Resource
  parameters(params: P | null, { alias }: { alias?: boolean } = {}) {
    const segments = this.cloneSegments();
    const segment = segments.get(PathSegmentNames.function);
    let parameters = params !== null ? this.encode(params) : null;
    if (alias && parameters !== null) {
      parameters = Object.entries(parameters).reduce((acc, [name, param]) => {
        return Object.assign(acc, { [name]: functionAlias(param, name) });
      }, {});
    }
    segment.parameters(parameters);
    return new ODataFunctionResource<P, R>(
      this.api,
      segments,
      this.cloneQuery()
    );
  }

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
      function() {
        return segments.get(PathSegmentNames.function);
      },
    };
  }

  /**
   * Handle query options of the function
   * @returns Handler for mutate the query of the function
   */
  get query() {
    return this.entitiesQueryHandler();
  }
  //#endregion

  //#region Requests
  get(options?: HttpEntityOptions): Observable<ODataEntity<R>>;
  get(options?: HttpEntitiesOptions): Observable<ODataEntities<R>>;
  get(options?: HttpPropertyOptions): Observable<ODataProperty<R>>;
  get(
    options?: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions
  ): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Shortcuts
  call(
    params: P | null,
    options?: { alias?: boolean } & HttpEntityOptions
  ): Observable<ODataEntity<R>>;
  call(
    params: P | null,
    options?: { alias?: boolean } & HttpEntitiesOptions
  ): Observable<ODataEntities<R>>;
  call(
    params: P | null,
    options?: { alias?: boolean } & HttpPropertyOptions
  ): Observable<ODataProperty<R>>;
  call(
    params: P | null,
    options?: { alias?: boolean } & HttpNoneOptions
  ): Observable<null>;
  call(
    params: P | null,
    {
      alias,
      ...options
    }: { alias?: boolean } & HttpEntityOptions &
      HttpEntitiesOptions &
      HttpPropertyOptions &
      HttpNoneOptions = {}
  ): Observable<any> {
    return this.parameters(params, { alias }).get(options);
  }

  callProperty(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & HttpOptions = {}
  ): Observable<R | null> {
    return this.call(params, {
      responseType: 'property',
      alias,
      ...options,
    }).pipe(map(({ property }) => property));
  }

  callEntity(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & HttpOptions = {}
  ): Observable<R | null> {
    return this.call(params, {
      responseType: 'entity',
      alias,
      ...options,
    }).pipe(map(({ entity }) => entity));
  }

  callModel(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & HttpOptions = {}
  ): Observable<ODataModel<R> | null> {
    return this.call(params, {
      responseType: 'entity',
      alias,
      ...options,
    }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel(entity, { annots, reset: true }) : null
      )
    );
  }

  callEntities(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & HttpOptions = {}
  ): Observable<R[] | null> {
    return this.call(params, {
      responseType: 'entities',
      alias,
      ...options,
    }).pipe(map(({ entities }) => entities));
  }

  callCollection(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & HttpOptions = {}
  ): Observable<ODataCollection<R, ODataModel<R>> | null> {
    return this.call(params, {
      responseType: 'entities',
      alias,
      ...options,
    }).pipe(
      map(({ entities, annots }) =>
        entities ? this.asCollection(entities, { annots, reset: true }) : null
      )
    );
  }
  //#endregion
}
