import { EMPTY, Observable } from 'rxjs';
import { concatMap, expand, map, toArray } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntities, ODataEntity } from '../responses';
import { ODataActionResource } from './action';
import { ODataCountResource } from './count';
import { ODataEntityResource } from './entity';
import { ODataFunctionResource } from './function';
import { ODataOptions } from './options';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(
    api: ODataApi,
    path: string,
    type: string | undefined,
    segments: ODataPathSegments,
    query: ODataQueryOptions<E>
  ) {
    const segment = segments.add(PathSegmentNames.entitySet, path);
    if (type) segment.type(type);
    return new ODataEntitySetResource<E>(api, segments, query);
  }

  clone() {
    return new ODataEntitySetResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery<T>()
    );
  }
  //#endregion

  schema() {
    let type = this.type();
    return type !== undefined
      ? this.api.findStructuredTypeForType<T>(type)
      : undefined;
  }

  entity(key?: any) {
    const entity = ODataEntityResource.factory<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery<T>()
    );
    if (key !== undefined) {
      return entity.key(key);
    }
    return entity;
  }

  cast<C>(type: string) {
    let segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataEntitySetResource<C>(this.api, segments, this.cloneQuery());
  }

  action<P, R>(path: string) {
    return ODataActionResource.fromResource<P, R>(this, path);
  }

  function<P, R>(path: string) {
    return ODataFunctionResource.fromResource<P, R>(this, path);
  }

  count() {
    return ODataCountResource.factory<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery<T>()
    );
  }

  //#region Requests
  protected post(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<ODataEntity<T>> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected get(
    options: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<ODataEntities<T>> {
    return super.get({ responseType: 'entities', ...options });
  }
  //#endregion

  //#region Shortcuts
  create(
    attrs: Partial<T>,
    options?: ODataOptions
  ): Observable<ODataEntity<T>> {
    return this.post(attrs, options);
  }

  fetch(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntities<T>> {
    return this.get(options);
  }

  fetchEntities(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<T[] | null> {
    return this.fetch(options).pipe(map(({ entities }) => entities));
  }

  fetchCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataCollection<T, ODataModel<T>> | null> {
    return this.fetch(options).pipe(
      map(({ entities, annots }) =>
        entities
          ? this.asCollection<M, C>(entities, { annots, reset: true })
          : null
      )
    );
  }

  fetchAll(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<T[]> {
    let res = this.clone();
    // Clean Paging
    res.query((q) => q.clearPaging());
    let fetch = (opts?: {
      skip?: number;
      skiptoken?: string;
      top?: number;
    }): Observable<ODataEntities<T>> => {
      if (opts) {
        res.query((q) => q.paging(opts));
      }
      return res.fetch(options);
    };
    return fetch().pipe(
      expand(({ annots: meta }) =>
        meta.skip || meta.skiptoken ? fetch(meta) : EMPTY
      ),
      concatMap(({ entities }) => entities || []),
      toArray()
    );
  }
  //#endregion
}
