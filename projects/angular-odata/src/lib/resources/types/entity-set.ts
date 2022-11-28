import { concat, EMPTY, Observable } from 'rxjs';
import { concatMap, expand, map, reduce, toArray } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { ODataStructuredType } from '../../schema/structured-type';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import {
  ODataEntities,
  ODataEntitiesAnnotations,
  ODataEntity,
} from '../responses';
import { ODataActionResource } from './action';
import { ODataCountResource } from './count';
import { ODataEntityResource } from './entity';
import { ODataFunctionResource } from './function';
import { ODataOptions } from './options';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(
    api: ODataApi,
    {
      path,
      schema,
      query,
    }: {
      path: string;
      schema?: ODataStructuredType<E>;
      query?: ODataQueryOptions<E>;
    }
  ) {
    const segments = new ODataPathSegments();
    const segment = segments.add(PathSegmentNames.entitySet, path);
    if (schema !== undefined) segment.type(schema.type());
    return new ODataEntitySetResource<E>(api, { segments, query, schema });
  }
  override clone(): ODataEntitySetResource<T> {
    return super.clone() as ODataEntitySetResource<T>;
  }
  //#endregion

  entity(key?: any) {
    const entity = ODataEntityResource.factory<T>(this.api, {
      schema: this.schema as ODataStructuredType<T>,
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
    if (key !== undefined) {
      return entity.key(key);
    }
    return entity;
  }

  action<P, R>(path: string) {
    return ODataActionResource.fromResource<P, R>(this, path);
  }

  function<P, R>(path: string) {
    return ODataFunctionResource.fromResource<P, R>(this, path);
  }

  count() {
    return ODataCountResource.factory<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }

  cast<C>(type: string) {
    const baseSchema = this.schema as ODataStructuredType<T>;
    const castSchema = this.api.findStructuredTypeForType<C>(type);
    if (
      castSchema !== undefined &&
      baseSchema !== undefined &&
      !castSchema.isSubtypeOf(baseSchema)
    )
      throw new Error(`Cannot cast to ${type}`);
    const segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataEntitySetResource<C>(this.api, {
      segments,
      schema: castSchema,
      query: this.cloneQuery<C>(),
    });
  }

  //#region Requests
  protected override post(
    attrs: Partial<T>,
    options?: ODataOptions
  ): Observable<any> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected override get(
    options: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<any> {
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

  fetchAll(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<{ entities: T[]; annots: ODataEntitiesAnnotations<T> }> {
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
      expand(({ annots }) =>
        annots.skip || annots.skiptoken ? fetch(annots) : EMPTY
      ),
      map(({ entities, annots }) => ({ entities: entities || [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])],
        annots: acc.annots.union(annots),
      }))
    );
  }

  fetchMany(
    top: number,
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<{ entities: T[]; annots: ODataEntitiesAnnotations<T> }> {
    let res = this.clone();
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
    return fetch({ top }).pipe(
      expand(({ annots }) =>
        annots.skip || annots.skiptoken ? fetch(annots) : EMPTY
      ),
      map(({ entities, annots }) => ({ entities: entities || [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])],
        annots: acc.annots.union(annots),
      }))
    );
  }

  fetchOne(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<{ entity: T | null; annots: ODataEntitiesAnnotations<T> }> {
    return this.fetchMany(1, options).pipe(
      map(({ entities, annots }) => ({
        entity: entities.length === 1 ? entities[0] : null,
        annots,
      }))
    );
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
  ): Observable<C | null> {
    return this.fetch(options).pipe(
      map(({ entities, annots }) =>
        entities
          ? this.asCollection<M, C>(entities, { annots, reset: true })
          : null
      )
    );
  }
  //#endregion
}
