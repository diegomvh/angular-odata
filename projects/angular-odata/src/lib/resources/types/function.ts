import {
  ODataEntities,
  ODataEntitiesAnnotations,
  ODataEntity,
  ODataEntityAnnotations,
  ODataProperty,
} from '../responses';
import {
  ODataEntitiesOptions,
  ODataEntityOptions,
  ODataNoneOptions,
  ODataOptions,
  ODataPropertyOptions,
} from './options';

import { ODataApi } from '../../api';
import { ODataCollection } from '../../models/collection';
import { ODataEntityResource } from './entity';
import { ODataEntitySetResource } from './entity-set';
import { ODataModel } from '../../models/model';
import { ODataPathSegments } from '../path-segments';
import {
  ODataQueryOptions,
  Expand,
  Filter,
  OrderBy,
  Select,
  Transform,
  alias as fAlias,
} from '../query';
import { ODataResource } from '../resource';
import { Observable } from 'rxjs';
import { PathSegmentNames } from '../../types';
import { map } from 'rxjs/operators';

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
  asModel<M extends ODataModel<R>>(
    entity: Partial<R> | { [name: string]: any },
    { annots, reset }: { annots?: ODataEntityAnnotations; reset?: boolean } = {}
  ): M {
    let resource: ODataEntityResource<R> | undefined;
    const type = annots?.type || this.returnType();
    const Model = this.api.modelForType(type);
    let path = annots?.entitySet;
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
    let path = annots?.entitySet;
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
        return Object.assign(acc, { [name]: fAlias(param, name) });
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
  protected get(
    options?: ODataEntityOptions & ODataEntitiesOptions & ODataPropertyOptions
  ): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Shortcuts
  /**
   * Execute the function
   * @param params Parameters to be sent to the function
   * @param alias If true, the parameters will be send using aliases
   * @param options Options for the request
   */
  call(
    params: P | null,
    options?: { alias?: boolean } & ODataEntityOptions
  ): Observable<ODataEntity<R>>;
  call(
    params: P | null,
    options?: { alias?: boolean } & ODataEntitiesOptions
  ): Observable<ODataEntities<R>>;
  call(
    params: P | null,
    options?: { alias?: boolean } & ODataPropertyOptions
  ): Observable<ODataProperty<R>>;
  call(
    params: P | null,
    options?: { alias?: boolean } & ODataNoneOptions
  ): Observable<null>;
  call(
    params: P | null,
    {
      alias,
      ...options
    }: { alias?: boolean } & ODataEntityOptions &
      ODataEntitiesOptions &
      ODataPropertyOptions &
      ODataNoneOptions = {}
  ): Observable<any> {
    return this.parameters(params, { alias }).get(options);
  }

  /**
   * Execute the function with the given parameters and return the result as a property
   * @param params Parameters to be sent to the function
   * @param alias If true, the parameters will be send using aliases
   * @param options Options for the request
   * @returns Observable of the result of the function
   */
  callProperty(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & ODataOptions = {}
  ): Observable<R | null> {
    return this.call(params, {
      responseType: 'property',
      alias,
      ...options,
    }).pipe(map(({ property }) => property));
  }

  /**
   * Execute the function with the given parameters and return the result as a entity
   * @param params Parameters to be sent to the function
   * @param alias If true, the parameters will be send using aliases
   * @param options Options for the request
   * @returns Observable of the result of the function
   */
  callEntity(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & ODataOptions = {}
  ): Observable<R | null> {
    return this.call(params, {
      responseType: 'entity',
      alias,
      ...options,
    }).pipe(map(({ entity }) => entity));
  }

  /**
   * Execute the function with the given parameters and return the result as a model
   * @param params Parameters to be sent to the function
   * @param alias If true, the parameters will be send using aliases
   * @param options Options for the request
   * @returns Observable of the result of the function
   */
  callModel<M extends ODataModel<R>>(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & ODataOptions = {}
  ): Observable<M | null> {
    return this.call(params, {
      responseType: 'entity',
      alias,
      ...options,
    }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel<M>(entity, { annots, reset: true }) : null
      )
    );
  }

  /**
   * Execute the function with the given parameters and return the result as a entities
   * @param params Parameters to be sent to the function
   * @param alias If true, the parameters will be send using aliases
   * @param options Options for the request
   * @returns Observable of the result of the function
   */
  callEntities(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & ODataOptions = {}
  ): Observable<R[] | null> {
    return this.call(params, {
      responseType: 'entities',
      alias,
      ...options,
    }).pipe(map(({ entities }) => entities));
  }

  /**
   * Execute the function with the given parameters and return the result as a collection
   * @param params Parameters to be sent to the function
   * @param alias If true, the parameters will be send using aliases
   * @param options Options for the request
   * @returns Observable of the result of the function
   */
  callCollection<M extends ODataModel<R>, C extends ODataCollection<R, M>>(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & ODataOptions = {}
  ): Observable<C | null> {
    return this.call(params, {
      responseType: 'entities',
      alias,
      ...options,
    }).pipe(
      map(({ entities, annots }) =>
        entities
          ? this.asCollection<M, C>(entities, { annots, reset: true })
          : null
      )
    );
  }
  //#endregion
}
