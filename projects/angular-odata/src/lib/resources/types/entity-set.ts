import { EMPTY, Observable } from 'rxjs';
import { EntityKey, ODataResource } from '../resource';
import { ODataCollection, ODataModel } from '../../models';
import {
  ODataEntities,
  ODataEntitiesAnnotations,
  ODataEntity,
} from '../responses';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { concatMap, expand, map, toArray } from 'rxjs/operators';

import { ODataActionResource } from './action';
import { ODataApi } from '../../api';
import { ODataCountResource } from './count';
import { ODataEntityResource } from './entity';
import { ODataFunctionResource } from './function';
import { ODataOptions } from './options';
import { ODataPathSegments } from '../path-segments';
import {
  ODataQueryOptions,
  Expand,
  Filter,
  OrderBy,
  Select,
  Transform,
} from '../query';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(
    api: ODataApi,
    path: string,
    type: string | undefined,
    segments: ODataPathSegments,
    query: ODataQueryOptions
  ) {
    const segment = segments.add(PathSegmentNames.entitySet, path);
    if (type) segment.type(type);
    return new ODataEntitySetResource<E>(api, segments, query);
  }
  //#endregion

  clone() {
    return new ODataEntitySetResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  schema() {
    let type = this.type();
    return type !== undefined
      ? this.api.findStructuredTypeForType<T>(type)
      : undefined;
  }

  asCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    entities: Partial<T>[] | { [name: string]: any }[],
    {
      annots,
      reset = false,
    }: { annots?: ODataEntitiesAnnotations; reset?: boolean } = {}
  ): C {
    const type = annots?.type || this.type();
    const Collection = this.api.collectionForType(type);
    return new Collection(entities, { resource: this, annots, reset }) as C;
  }

  //#region Inmutable Resource
  entity(key?: any) {
    const entity = ODataEntityResource.factory<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
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
    let type;
    const callable = this.api.findCallableForType(path, this.type());
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
    }
    return ODataActionResource.factory<P, R>(
      this.api,
      path,
      type,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  function<P, R>(path: string) {
    let type;
    const callable = this.api.findCallableForType(path, this.type());
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
    }
    return ODataFunctionResource.factory<P, R>(
      this.api,
      path,
      type,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  count() {
    return ODataCountResource.factory(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  select(opts: Select<T>) {
    const clone = this.clone();
    clone.query.select(opts);
    return clone;
  }

  expand(opts: Expand<T>) {
    const clone = this.clone();
    clone.query.expand(opts);
    return clone;
  }

  transform(opts: Transform<T>) {
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

  orderBy(opts: OrderBy<T>) {
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
      keys(values?: (EntityKey<T> | undefined)[]) {
        return segments.keys(values);
      },
    };
  }

  get query() {
    return this.entitiesQueryHandler();
  }
  //#endregion

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
    res.query.clearPaging();
    let fetch = (opts?: {
      skip?: number;
      skiptoken?: string;
      top?: number;
    }): Observable<ODataEntities<T>> => {
      if (opts) {
        res.query.paging(opts);
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
