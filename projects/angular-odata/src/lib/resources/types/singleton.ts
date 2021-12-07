import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataModel } from '../../models';
import { ODataStructuredTypeParser } from '../../schema';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntity, ODataEntityAnnotations } from '../responses';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataNavigationPropertyResource } from './navigation-property';
import { ODataOptions } from './options';
import { ODataPropertyResource } from './property';

export class ODataSingletonResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<R>(
    api: ODataApi,
    path: string,
    type: string | undefined,
    segments: ODataPathSegments,
    query: ODataQueryOptions<R>
  ) {
    const segment = segments.add(PathSegmentNames.singleton, path);
    if (type !== undefined) segment.type(type);
    query.keep(QueryOptionNames.format);
    return new ODataSingletonResource<R>(api, { segments, query });
  }

  clone() {
    return new ODataSingletonResource<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }
  //#endregion

  schema() {
    let type = this.type();
    return type !== undefined
      ? this.api.findStructuredTypeForType<T>(type)
      : undefined;
  }

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
        this.api.findStructuredTypeForType<T>(types[index])
      )
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
    return ODataActionResource.fromResource<P, R>(this, path);
  }

  //#region Requests
  protected post(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<ODataEntity<T>> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected put(
    attrs: Partial<T>,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<ODataEntity<T>> {
    return super.put(attrs, { responseType: 'entity', ...options });
  }

  protected patch(
    attrs: Partial<T>,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<ODataEntity<T>> {
    return super.patch(attrs, { responseType: 'entity', ...options });
  }

  protected delete(
    options: ODataOptions & { etag?: string } = {}
  ): Observable<any> {
    return super.delete({ responseType: 'entity', ...options });
  }

  protected get(
    options: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<ODataEntity<T>> {
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
    options?: ODataOptions
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
    options?: ODataOptions & { etag?: string }
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
    options?: ODataOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    return this.patch(attrs, options);
  }

  /**
   * Delete an existing entity.
   * @param options The options for the request.
   * @returns Observable of the deleted entity.
   */
  destroy(options?: ODataOptions & { etag?: string }): Observable<any> {
    return this.delete(options);
  }

  /**
   * Fetch an existing entity.
   * @param options The options for the request.
   * @param etag The etag to use for the request.
   * @returns Observable of the entity with the annotations.
   */
  fetch(
    options?: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntity<T>> {
    return this.get(options);
  }

  /**
   * Fetch an existing entity.
   * @param options The options for the request.
   * @param etag The etag to use for the request.
   * @returns Observable of the entity.
   */
  fetchEntity(
    options?: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<T | null> {
    return this.fetch(options).pipe(map(({ entity }) => entity));
  }

  /**
   * Fetch an existing entity and return a model.
   * @param options The options for the request.
   * @param etag The etag to use for the request.
   * @returns Observable of the entity.
   */
  fetchModel<M extends ODataModel<T>>(
    options?: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<M | null> {
    return this.fetch(options).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel<M>(entity, { annots, reset: true }) : null
      )
    );
  }
  //#endregion
}
