import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { PathSegment } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataResource } from '../resource';
import {
  ODataEntitiesOptions,
  ODataEntityOptions,
  ODataOptions,
  ODataPropertyOptions,
} from './options';
import { ODataEntities, ODataEntity, ODataProperty } from '../response';

export class ODataActionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(
    api: ODataApi,
    {
      path,
      outgoingType,
      incomingType,
      bindingType,
      segments,
    }: {
      path: string;
      outgoingType?: string;
      incomingType?: string;
      bindingType?: string;
      segments?: ODataPathSegments;
    },
  ) {
    segments = segments ?? new ODataPathSegments();

    const segment = segments.add(PathSegment.action, path);
    if (outgoingType !== undefined) {
      segment.outgoingType(outgoingType);
    }
    if (incomingType !== undefined) {
      segment.incomingType(incomingType);
    }
    if (bindingType !== undefined) {
      segment.bindingType(bindingType);
    }
    return new ODataActionResource<P, R>(api, { segments });
  }

  static fromResource<P, R>(resource: ODataResource<any>, path: string) {
    const baseType = resource.outgoingType();
    const callable = resource.api.findCallable<R>(path, baseType);

    const outgoingType = callable?.type();
    const bindingType = callable?.binding()?.type;
    const incomingType = callable?.returnType();

    const action = ODataActionResource.factory<P, R>(resource.api, {
      path,
      outgoingType,
      bindingType,
      incomingType,
      segments: resource.cloneSegments(),
    });

    // Switch entitySet to binding type if available
    if (bindingType !== undefined && bindingType !== baseType) {
      let entitySet = resource.api.findEntitySet(bindingType);
      if (entitySet !== undefined) {
        action.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }

    return action;
  }

  override clone(): ODataActionResource<P, R> {
    return super.clone() as ODataActionResource<P, R>;
  }
  //#endregion

  //#region Requests
  protected override post(
    params: P | null,
    options?: ODataEntityOptions & ODataEntitiesOptions & ODataPropertyOptions,
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
  call(params: P | null, options?: ODataEntityOptions): Observable<ODataEntity<R>>;
  call(params: P | null, options?: ODataEntitiesOptions): Observable<ODataEntities<R>>;
  call(params: P | null, options?: ODataPropertyOptions): Observable<ODataProperty<R>>;
  call(
    params: P | null,
    options?: { alias?: boolean; responseType?: 'blob' } & ODataOptions,
  ): Observable<Blob>;
  call(
    params: P | null,
    options?: { alias?: boolean; responseType?: 'arraybuffer' } & ODataOptions,
  ): Observable<ArrayBuffer>;
  call(
    params: P | null,
    options?: { alias?: boolean; responseType?: 'none' } & ODataOptions,
  ): Observable<null>;
  call(
    params: P | null,
    options: ODataEntityOptions & ODataEntitiesOptions & ODataPropertyOptions = {},
  ): Observable<any> {
    return this.clone().post(params, options);
  }

  /**
   * Execute the action and return the result as a property
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callProperty(params: P | null, options: ODataOptions = {}) {
    return this.call(params, { responseType: 'property', ...options }).pipe(
      map(({ property }) => property),
    );
  }

  /**
   * Execute the action and return the result as a entity
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callEntity(params: P | null, options: ODataOptions = {}) {
    return this.call(params, { responseType: 'entity', ...options }).pipe(
      map(({ entity }) => entity),
    );
  }

  /**
   * Execute the action and return the result as a model
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callModel(params: P | null, options: ODataOptions & { ModelType?: typeof ODataModel } = {}) {
    return this.call(params, { responseType: 'entity', ...options }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel(entity, { annots, ModelType: options?.ModelType }) : null,
      ),
    );
  }

  /**
   * Execute the action and return the result as a entities
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callEntities(params: P | null, options: ODataOptions = {}) {
    return this.call(params, { responseType: 'entities', ...options }).pipe(
      map(({ entities }) => entities),
    );
  }

  /**
   * Execute the action and return the result as a collection
   * @param params Parameters for the action
   * @param options Options for the request
   * @returns Observable of the result of the action
   */
  callCollection(
    params: P | null,
    options: ODataOptions & { CollectionType?: typeof ODataCollection } = {},
  ) {
    return this.call(params, { responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) =>
        entities
          ? this.asCollection(entities, {
              annots,
              CollectionType: options?.CollectionType,
            })
          : null,
      ),
    );
  }
  //#endregion

  callArraybuffer(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & ODataOptions = {},
  ) {
    return this.call(params, {
      responseType: 'arraybuffer',
      alias,
      ...options,
    });
  }

  callBlob(params: P | null, { alias, ...options }: { alias?: boolean } & ODataOptions = {}) {
    return this.call(params, { responseType: 'blob', alias, ...options });
  }
}
