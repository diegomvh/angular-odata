import { EMPTY, Observable } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { ODataStructuredType } from '../../schema/structured-type';
import { QueryOption } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import {
  ODataEntities,
  ODataEntitiesAnnotations,
} from '../responses';
import { ODataOptions } from './options';

export class ODataTransformationResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(
    api: ODataApi,
    {
      schema,
      segments,
      query,
    }: {
      schema: ODataStructuredType<E>;
      segments: ODataPathSegments;
      query: ODataQueryOptions<E>;
    }
  ) {
    return new ODataTransformationResource<E>(api, { segments, query, schema });
  }

  override clone(): ODataTransformationResource<T> {
    return super.clone() as ODataTransformationResource<T>;
  }
  //#endregion

  override returnType() {
    return this.schema?.type();
  }

  //#region Requests
  protected override get(
    options: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    } = {},
  ): Observable<any> {
    return super.get({ responseType: 'entities', ...options });
  }
  //#endregion

  //#region Shortcuts
  fetch(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<ODataEntities<T>> {
    return this.get(options);
  }

  fetchAll(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<{ entities: T[]; annots: ODataEntitiesAnnotations<T> }> {
    let res = this.clone();
    // Clean Paging
    res.query((q) => q.removePaging());
    let fetch = (opts?: {
      skip?: number;
      skiptoken?: string;
      top?: number;
    }): Observable<ODataEntities<any>> => {
      if (opts) {
        res.query((q) => q.paging(opts));
      }
      return res.fetch(options);
    };
    return fetch().pipe(
      expand(({ annots }) =>
        annots.skip || annots.skiptoken ? fetch(annots) : EMPTY,
      ),
      map(({ entities, annots }) => ({ entities: entities || [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])],
        annots: acc.annots.union(annots),
      })),
    );
  }

  fetchMany(
    top: number,
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<{ entities: T[]; annots: ODataEntitiesAnnotations<T> }> {
    let res = this.clone();
    let fetch = (opts?: {
      skip?: number;
      skiptoken?: string;
      top?: number;
    }): Observable<ODataEntities<any>> => {
      if (opts) {
        res.query((q) => q.paging(opts));
      }
      return res.fetch(options);
    };
    return fetch({ top }).pipe(
      expand(({ annots }) =>
        annots.skip || annots.skiptoken ? fetch(annots) : EMPTY,
      ),
      map(({ entities, annots }) => ({ entities: entities || [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])],
        annots: acc.annots.union(annots),
      })),
    );
  }

  fetchOne(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<{ entity: T | null; annots: ODataEntitiesAnnotations<T> }> {
    return this.fetchMany(1, options).pipe(
      map(({ entities, annots }) => ({
        entity: entities.length === 1 ? entities[0] : null,
        annots,
      })),
    );
  }

  fetchEntities(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<T[] | null> {
    return this.fetch(options).pipe(map(({ entities }) => entities));
  }

  fetchCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<C | null> {
    return this.fetch(options).pipe(
      map(({ entities, annots }) =>
        entities ? this.asCollection<M, C>(entities, { annots }) : null,
      ),
    );
  }
  //#endregion
}
