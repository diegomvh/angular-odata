import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { $ID, $REF, ODATA_ID } from '../../constants';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntities, ODataEntity } from '../responses/types';
import { ODataEntityResource } from './entity';
import {
  ODataEntitiesOptions,
  ODataEntityOptions,
  ODataOptions,
} from './options';

export class ODataReferenceResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<P>(
    api: ODataApi,
    {
      segments,
      query,
    }: { segments: ODataPathSegments; query?: ODataQueryOptions<P> }
  ) {
    segments.add(PathSegmentNames.reference, $REF);
    query?.clear();
    return new ODataReferenceResource<P>(api, { segments, query });
  }
  //#endregion

  //#region Requests
  protected post(
    target: ODataEntityResource<any>,
    options?: ODataOptions
  ): Observable<any> {
    return super.post({ [ODATA_ID]: target.endpointUrl(false) }, options);
  }

  protected put(
    target: ODataEntityResource<any>,
    options?: ODataOptions & { etag?: string }
  ): Observable<any> {
    return super.put({ [ODATA_ID]: target.endpointUrl(false) }, options);
  }

  protected delete({
    etag,
    target,
    ...options
  }: {
    etag?: string;
    target?: ODataEntityResource<any>;
  } & ODataOptions = {}): Observable<any> {
    if (target) {
      options.params = { [$ID]: target.endpointUrl(false) };
    }
    return super.delete({ etag, ...options });
  }
  //#endregion

  //#region Shortcuts for collections
  /**
   * Add the given target to the collection.
   * @param target The target resource
   * @param options Options for the request
   * @returns Observable of the response
   */
  add(
    target: ODataEntityResource<any>,
    options?: ODataOptions
  ): Observable<any> {
    return this.post(target, options);
  }

  /**
   * Remove the given target from the collection.
   * @param target The target resource
   * @param options Options for the request
   * @returns Observable of the response
   */
  remove(
    target?: ODataEntityResource<any>,
    options?: ODataOptions
  ): Observable<any> {
    return this.delete({ target, ...options });
  }
  //#region

  //#region Shortcuts for single
  /**
   * Set the reference to the given target.
   * @param target The target resource
   * @param options Options for the request
   * @returns Observable of the response
   */
  set(
    target: ODataEntityResource<any>,
    options?: ODataOptions & { etag?: string }
  ): Observable<any> {
    return this.put(target, options);
  }

  /**
   * Unset the reference to the given target.
   * @param options Options for the request.
   * @returns Observable of the response
   */
  unset(options?: ODataOptions & { etag?: string }): Observable<any> {
    return this.delete(options);
  }
  //#endregion

  //#region Fetch
  /**
   * Fetch entity / entities
   * @param options Options for the request
   * @return An observable of the entity or entities with annotations
   */
  fetch(
    options?: ODataEntityOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntity<T>>;
  fetch(
    options?: ODataEntitiesOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntities<T>>;
  fetch(
    options: ODataEntityOptions &
      ODataEntitiesOptions & {
        etag?: string;
        bodyQueryOptions?: QueryOptionNames[];
      } = {}
  ): Observable<any> {
    return this.get(options);
  }

  /**
   * Fetch the entity
   * @param options Options for the request
   * @returns The entity
   */
  fetchEntity(
    options: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<T | null> {
    return this.fetch({ responseType: 'entity', ...options }).pipe(
      map(({ entity }) => entity)
    );
  }

  /**
   * Fetch entities
   * @param options Options for the request
   * @returns The entities
   */
  fetchEntities(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<T[] | null> {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities }) => entities)
    );
  }
  //#endregion
}
