import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection } from '../../models/collection';
import { ODataModel } from '../../models/model';
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

export class ODataFunctionResource<P, R> extends ODataResource<R> {
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

    const segment = segments.add(PathSegment.function, path);
    if (outgoingType !== undefined) {
      segment.outgoingType(outgoingType);
    }
    if (incomingType !== undefined) {
      segment.incomingType(incomingType);
    }
    if (bindingType !== undefined) {
      segment.bindingType(bindingType);
    }
    return new ODataFunctionResource<P, R>(api, { segments });
  }

  static fromResource<P, R>(resource: ODataResource<any>, path: string) {
    const baseType = resource.outgoingType();
    const callable = resource.api.findCallable<R>(path, baseType);

    const outgoingType = callable?.type();
    const bindingType = callable?.binding()?.type;
    const incomingType = callable?.returnType();

    const func = ODataFunctionResource.factory<P, R>(resource.api, {
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
        func.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }

    return func;
  }

  override clone(): ODataFunctionResource<P, R> {
    return super.clone() as ODataFunctionResource<P, R>;
  }
  //#endregion

  parameters(params: P | null, { alias }: { alias?: boolean } = {}) {
    let parameters = params !== null ? this.encode(params) : null;
    if (alias && parameters !== null) {
      this.query((q) => {
        parameters = Object.entries(parameters).reduce((acc, [name, param]) => {
          return Object.assign(acc, { [name]: q.alias(param, name) });
        }, {});
      });
    }
    return this.clone().segment((s) => s.function().parameters<P>(parameters));
  }

  //#region Requests
  protected override get(
    options?: ODataEntityOptions & ODataEntitiesOptions & ODataPropertyOptions,
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
    options?: { alias?: boolean } & ODataEntityOptions,
  ): Observable<ODataEntity<R>>;
  call(
    params: P | null,
    options?: { alias?: boolean } & ODataEntitiesOptions,
  ): Observable<ODataEntities<R>>;
  call(
    params: P | null,
    options?: { alias?: boolean } & ODataPropertyOptions,
  ): Observable<ODataProperty<R>>;
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
    {
      alias,
      ...options
    }: {
      alias?: boolean;
      responseType?: 'blob' | 'arraybuffer';
    } & ODataEntityOptions &
      ODataEntitiesOptions &
      ODataPropertyOptions = {},
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
    { alias, ...options }: { alias?: boolean } & ODataOptions = {},
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
    { alias, ...options }: { alias?: boolean } & ODataOptions = {},
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
  callModel(
    params: P | null,
    {
      alias,
      ModelType,
      ...options
    }: ODataOptions & { alias?: boolean; ModelType?: typeof ODataModel } = {},
  ) {
    return this.call(params, {
      responseType: 'entity',
      alias,
      ...options,
    }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel(entity, { annots, ModelType }) : null,
      ),
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
    { alias, ...options }: { alias?: boolean } & ODataOptions = {},
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
  callCollection(
    params: P | null,
    {
      alias,
      CollectionType,
      ...options
    }: {
      alias?: boolean;
      CollectionType?: typeof ODataCollection;
    } & ODataOptions = {},
  ) {
    return this.call(params, {
      responseType: 'entities',
      alias,
      ...options,
    }).pipe(
      map(({ entities, annots }) =>
        entities
          ? this.asCollection(entities, { annots, CollectionType })
          : null,
      ),
    );
  }
  //#endregion

  callArraybuffer(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & ODataOptions = {},
  ): Observable<ArrayBuffer> {
    return this.call(params, {
      responseType: 'arraybuffer',
      alias,
      ...options,
    });
  }

  callBlob(
    params: P | null,
    { alias, ...options }: { alias?: boolean } & ODataOptions = {},
  ): Observable<Blob> {
    return this.call(params, { responseType: 'blob', alias, ...options });
  }
}
