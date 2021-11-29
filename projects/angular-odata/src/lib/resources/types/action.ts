import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
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

export class ODataActionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(
    api: ODataApi,
    path: string,
    type: string | undefined,
    segments: ODataPathSegments,
    query: ODataQueryOptions<R>
  ) {
    const segment = segments.add(PathSegmentNames.action, path);
    if (type) segment.type(type);
    query.clear();
    return new ODataActionResource<P, R>(api, segments, query);
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
    const action = ODataActionResource.factory<P, R>(
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
        action.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }
    return action;
  }

  clone() {
    return new ODataActionResource<P, R>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery<R>()
    );
  }
  //#endregion

  schema() {
    //TODO: Binding Type
    let type = this.type();
    return type !== undefined
      ? this.api.findCallableForType<R>(type)
      : undefined;
  }

  returnType() {
    return this.schema()?.parser.return?.type;
  }

  //#region Requests
  protected post(
    params: P | null,
    options?: ODataEntityOptions & ODataEntitiesOptions & ODataPropertyOptions
  ): Observable<any> {
    return super.post(params, options);
  }
  //#endregion

  //#region Shortcuts
  /**
   * Execute the action
   * @param params Parameters to be sent to the action
   * @param options Options for the request
   */
  call(
    params: P | null,
    options?: ODataEntityOptions
  ): Observable<ODataEntity<R>>;
  call(
    params: P | null,
    options?: ODataEntitiesOptions
  ): Observable<ODataEntities<R>>;
  call(
    params: P | null,
    options?: ODataPropertyOptions
  ): Observable<ODataProperty<R>>;
  call(params: P | null, options?: ODataNoneOptions): Observable<null>;
  call(
    params: P | null,
    options: ODataEntityOptions &
      ODataEntitiesOptions &
      ODataPropertyOptions &
      ODataNoneOptions = {}
  ): Observable<any> {
    return this.clone().post(params, options);
  }

  /**
   * Execute the action and return the result as a property
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callProperty(
    params: P | null,
    options: ODataOptions = {}
  ): Observable<R | null> {
    return this.call(params, { responseType: 'property', ...options }).pipe(
      map(({ property }) => property)
    );
  }

  /**
   * Execute the action and return the result as a entity
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callEntity(
    params: P | null,
    options: ODataOptions = {}
  ): Observable<R | null> {
    return this.call(params, { responseType: 'entity', ...options }).pipe(
      map(({ entity }) => entity)
    );
  }

  /**
   * Execute the action and return the result as a model
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callModel<M extends ODataModel<R>>(
    params: P | null,
    options: ODataOptions = {}
  ): Observable<M | null> {
    return this.call(params, { responseType: 'entity', ...options }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel<M>(entity, { annots, reset: true }) : null
      )
    );
  }

  /**
   * Execute the action and return the result as a entities
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callEntities(
    params: P | null,
    options: ODataOptions = {}
  ): Observable<R[] | null> {
    return this.call(params, { responseType: 'entities', ...options }).pipe(
      map(({ entities }) => entities)
    );
  }

  /**
   * Execute the action and return the result as a collection
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callCollection<M extends ODataModel<R>, C extends ODataCollection<R, M>>(
    params: P | null,
    options: ODataOptions = {}
  ): Observable<C | null> {
    return this.call(params, { responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) =>
        entities
          ? this.asCollection<M, C>(entities, { annots, reset: true })
          : null
      )
    );
  }
  //#endregion
}
