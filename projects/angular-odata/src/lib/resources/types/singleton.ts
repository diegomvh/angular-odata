import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataModel } from '../../models';
import { ODataStructuredType } from '../../schema';
import { PathSegment, QueryOption } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntity } from '../responses';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataNavigationPropertyResource } from './navigation-property';
import { ODataOptions } from './options';
import { ODataPropertyResource } from './property';

export class ODataSingletonResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<S>(
    api: ODataApi,
    {
      path,
      schema,
      query,
    }: {
      path: string;
      schema?: ODataStructuredType<S>;
      query?: ODataQueryOptions<S>;
    },
  ) {
    const segments = new ODataPathSegments();
    const segment = segments.add(PathSegment.singleton, path);
    if (schema !== undefined) segment.type(schema.type());
    return new ODataSingletonResource<S>(api, { segments, query, schema });
  }
  override clone(): ODataSingletonResource<T> {
    return super.clone() as ODataSingletonResource<T>;
  }
  //#endregion

  key(value: any) {
    const singleton = this.clone();
    var key = this.resolveKey(value);
    if (key !== undefined) singleton.segment((s) => s.singleton().key(key));
    return singleton;
  }

  keys(values: any[]) {
    const singleton = this.clone();
    const types = this.pathSegments.types({ key: true });
    const keys = values.map((value, index) =>
      ODataResource.resolveKey(
        value,
        this.api.findStructuredTypeForType<T>(types[index]),
      ),
    );
    singleton.segment((s) => s.keys(keys));
    return singleton;
  }

  navigationProperty<N>(path: string) {
    return ODataNavigationPropertyResource.fromResource<N>(this, path);
  }

  property<P>(path: string) {
    return ODataPropertyResource.fromResource<P>(this, path);
  }

  action<P, R>(path: string) {
    return ODataActionResource.fromResource<P, R>(this, path);
  }

  function<P, R>(path: string) {
    return ODataFunctionResource.fromResource<P, R>(this, path);
  }

  //#region Requests
  protected override post(
    attrs: Partial<T>,
    options: ODataOptions = {},
  ): Observable<any> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected override put(
    attrs: Partial<T>,
    options: ODataOptions = {},
  ): Observable<any> {
    return super.put(attrs, { responseType: 'entity', ...options });
  }

  protected override patch(
    attrs: Partial<T>,
    options: ODataOptions = {},
  ): Observable<any> {
    return super.patch(attrs, { responseType: 'entity', ...options });
  }

  protected override delete(options: ODataOptions = {}): Observable<any> {
    return super.delete({ responseType: 'entity', ...options });
  }

  protected override get(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
    } = {},
  ): Observable<any> {
    return super.get({ responseType: 'entity', ...options });
  }
  //#endregion

  //#region Shortcuts
  /**
   * Creates a new entity.
   * @param attrs The entity attributes to create.
   * @param options The options for the request.
   * @returns The created entity with the annotations.
   */
  create(
    attrs: Partial<T>,
    options?: ODataOptions,
  ): Observable<ODataEntity<T>> {
    return this.post(attrs, options);
  }

  /**
   * Updates an existing entity.
   * @param attrs The entity attributes to update.
   * @param options The options for the request.
   * @returns The updated entity with the annotations.
   */
  update(
    attrs: Partial<T>,
    options?: ODataOptions,
  ): Observable<ODataEntity<T>> {
    return this.put(attrs, options);
  }

  /**
   * Modifies an existing entity.
   * @param attrs The entity attributes to modify.
   * @param options The options for the request.
   * @returns The modified entity with the annotations.
   */
  modify(
    attrs: Partial<T>,
    options?: ODataOptions,
  ): Observable<ODataEntity<T>> {
    return this.patch(attrs, options);
  }

  /**
   * Delete an existing entity.
   * @param options The options for the request.
   * @returns Observable of the deleted entity.
   */
  destroy(options?: ODataOptions): Observable<any> {
    return this.delete(options);
  }

  /**
   * Fetch an existing entity.
   * @param options The options for the request.
   * @returns Observable of the entity with the annotations.
   */
  fetch(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<ODataEntity<T>> {
    return this.get(options);
  }

  /**
   * Fetch an existing entity.
   * @param options The options for the request.
   * @returns Observable of the entity.
   */
  fetchEntity(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<T | null> {
    return this.fetch(options).pipe(map(({ entity }) => entity));
  }

  /**
   * Fetch an existing entity and return a model.
   * @param options The options for the request.
   * @returns Observable of the entity.
   */
  fetchModel<M extends ODataModel<T>>(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<M | null> {
    return this.fetch(options).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel<M>(entity, { annots }) : null,
      ),
    );
  }
  //#endregion
}
