import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { ODataCallable } from '../../schema/callable';
import { PathSegment } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntities, ODataEntity, ODataProperty } from '../responses';
import {
  ODataEntitiesOptions,
  ODataEntityOptions,
  ODataOptions,
  ODataPropertyOptions,
} from './options';

export class ODataActionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(
    api: ODataApi,
    {
      path,
      schema,
      segments,
      query,
    }: {
      path?: string;
      schema?: ODataCallable<R>;
      segments?: ODataPathSegments;
      query?: ODataQueryOptions<R>;
    },
  ) {
    segments = segments || new ODataPathSegments();
    path = schema !== undefined ? schema.path() : path;
    if (path === undefined)
      throw new Error(`ODataActionResource: path is required`);

    const segment = segments.add(PathSegment.action, path);
    if (schema !== undefined) segment.type(schema.type());
    return new ODataActionResource<P, R>(api, {
      segments,
      query,
      schema,
    });
  }

  static fromResource<P, R>(resource: ODataResource<any>, path: string) {
    const baseType = resource.type();
    const actionSchema = resource.api.findCallableForType<R>(path, baseType);
    const bindingType = actionSchema?.binding()?.type;

    const action = ODataActionResource.factory<P, R>(resource.api, {
      path,
      schema: actionSchema,
      segments: resource.cloneSegments(),
    });

    // Switch entitySet to binding type if available
    if (bindingType !== undefined && bindingType !== baseType) {
      let entitySet = resource.api.findEntitySetForType(bindingType);
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

  override returnType() {
    return this.schema instanceof ODataCallable
      ? this.schema.parser.return?.type
      : undefined;
  }

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
  call(
    params: P | null,
    options?: ODataEntityOptions,
  ): Observable<ODataEntity<R>>;
  call(
    params: P | null,
    options?: ODataEntitiesOptions,
  ): Observable<ODataEntities<R>>;
  call(
    params: P | null,
    options?: ODataPropertyOptions,
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
    options: ODataEntityOptions &
      ODataEntitiesOptions &
      ODataPropertyOptions = {},
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
    options: ODataOptions = {},
  ): Observable<R | null> {
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
  callEntity(
    params: P | null,
    options: ODataOptions = {},
  ): Observable<R | null> {
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
  callModel<M extends ODataModel<R>>(
    params: P | null,
    options: ODataOptions = {},
  ): Observable<M | null> {
    return this.call(params, { responseType: 'entity', ...options }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel<M>(entity, { annots }) : null,
      ),
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
    options: ODataOptions = {},
  ): Observable<R[] | null> {
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
  callCollection<M extends ODataModel<R>, C extends ODataCollection<R, M>>(
    params: P | null,
    options: ODataOptions = {},
  ): Observable<C | null> {
    return this.call(params, { responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) =>
        entities ? this.asCollection<M, C>(entities, { annots }) : null,
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
