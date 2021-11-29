import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection } from '../../models/collection';
import { ODataModel } from '../../models/model';
import { PathSegmentNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntities, ODataEntity, ODataProperty } from '../responses';
import {
  ODataEntitiesOptions,
  ODataEntityOptions,
  ODataNoneOptions,
  ODataOptions,
  ODataPropertyOptions,
} from './options';

export class ODataFunctionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(
    api: ODataApi,
    path: string,
    type: string | undefined,
    segments: ODataPathSegments,
    options: ODataQueryOptions<R>
  ) {
    const segment = segments.add(PathSegmentNames.function, path);
    if (type) segment.type(type);
    options.clear();
    return new ODataFunctionResource<P, R>(api, segments, options);
  }

  static fromResource<P, R>(resource: ODataResource<any>, path: string) {
    let type;
    let bindingType;
    const callable = resource.api.findCallableForType(path, resource.type());
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
      bindingType = callable.binding()?.type;
    }
    const func = ODataFunctionResource.factory<P, R>(
      resource.api,
      path,
      type,
      resource.cloneSegments(),
      resource.cloneQuery<R>()
    );

    // Switch entitySet to binding type if available
    if (bindingType !== undefined && bindingType !== resource.type()) {
      let entitySet = resource.api.findEntitySetForType(bindingType);
      if (entitySet !== undefined) {
        func.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }
    return func;
  }

  clone() {
    return new ODataFunctionResource<P, R>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery<R>()
    );
  }
  //#endregion

  returnType() {
    return this.schema()?.parser.return?.type;
  }

  schema() {
    //TODO: Binding Type
    let type = this.type();
    return type !== undefined
      ? this.api.findCallableForType<R>(type)
      : undefined;
  }

  parameters(params: P | null, { alias }: { alias?: boolean } = {}) {
    const segments = this.cloneSegments();
    const segment = segments.get(PathSegmentNames.function);
    let parameters = params !== null ? this.encode(params) : null;
    if (alias && parameters !== null) {
      this.query((q) => {
        parameters = Object.entries(parameters).reduce((acc, [name, param]) => {
          return Object.assign(acc, { [name]: q.alias(param, name) });
        }, {});
      });
    }
    segment.parameters(parameters);
    return new ODataFunctionResource<P, R>(
      this.api,
      segments,
      this.cloneQuery<R>()
    );
  }

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
