import { Observable } from 'rxjs';
import { EMPTY } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { ODataApi } from '../../api';
import type { ModelInterface, ODataCollection, ODataModel } from '../../models';
import {
  PathSegment,
  QueryOption,
  StructuredTypeFieldConfig,
} from '../../types';
import { ODataPathSegments } from '../path';
import {
  ApplyExpression,
  ApplyExpressionBuilder,
  ODataQueryOptions,
} from '../query';
import { ODataResource } from '../resource';
import { ODataActionResource } from './action';
import { ODataCountResource } from './count';
import { ODataEntityResource } from './entity';
import { ODataFunctionResource } from './function';
import { ODataOptions } from './options';
import { ODataEntities, ODataEntity } from '../response';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(
    api: ODataApi,
    {
      path,
      type,
      query,
    }: {
      path: string;
      type?: string;
      query?: ODataQueryOptions<E>;
    },
  ) {
    const segments = new ODataPathSegments();
    const segment = segments.add(PathSegment.entitySet, path);
    if (type !== undefined) {
      segment.outgoingType(type);
      segment.incomingType(type);
    }
    return new ODataEntitySetResource<E>(api, { segments, query });
  }

  override clone(): ODataEntitySetResource<T> {
    return super.clone() as ODataEntitySetResource<T>;
  }

  override transform<R>(
    opts: (
      builder: ApplyExpressionBuilder<T>,
      current?: ApplyExpression<T>,
    ) => ApplyExpression<T>,
    {
      type,
      fields,
    }: {
      type?: string;
      fields?: { [name: string]: StructuredTypeFieldConfig };
    } = {},
  ): ODataEntitySetResource<R> {
    return super.transform<R>(opts, {
      type,
      fields,
    }) as ODataEntitySetResource<R>;
  }
  //#endregion

  entity(key?: any) {
    const entity = ODataEntityResource.factory<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
    if (key !== undefined) {
      return entity.key(key);
    }
    return entity;
  }

  action<P, R>(path: string): ODataActionResource<P, R> {
    return ODataActionResource.fromResource<P, R>(this, path);
  }

  function<P, R>(path: string): ODataFunctionResource<P, R> {
    return ODataFunctionResource.fromResource<P, R>(this, path);
  }

  count() {
    return ODataCountResource.factory<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }

  cast<C>(type: string) {
    const thisType = this.incomingType();
    const baseSchema =
      thisType !== undefined ? this.api.structuredType(thisType) : undefined;
    const castSchema = this.api.findStructuredType<C>(type);
    if (
      castSchema !== undefined &&
      baseSchema !== undefined &&
      !castSchema.isSubtypeOf(baseSchema)
    )
      throw new Error(`cast: Cannot cast to ${type}`);
    const segments = this.cloneSegments();
    segments.add(PathSegment.type, type).incomingType(type);
    return new ODataEntitySetResource<C>(this.api, {
      segments,
      query: this.cloneQuery<C>(),
    });
  }

  //#region Requests
  protected override post(
    attrs: Partial<T>,
    options?: ODataOptions,
  ): Observable<any> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

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
  create(
    attrs: Partial<T>,
    options?: ODataOptions,
  ): Observable<ODataEntity<T>> {
    return this.post(attrs, options);
  }

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
  ) {
    const res = this.clone();
    // Clean Paging
    res.query((q) => q.removePaging());
    const fetch = (opts?: {
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
      map(({ entities, annots }) => ({ entities: entities ?? [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities ?? []), ...(entities ?? [])],
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
  ) {
    const res = this.clone();
    const fetch = (opts?: {
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
        annots.skip || annots.skiptoken ? fetch(annots) : EMPTY,
      ),
      map(({ entities, annots }) => ({ entities: entities ?? [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities ?? []), ...(entities ?? [])],
        annots: acc.annots.union(annots),
      })),
    );
  }

  fetchOne(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ) {
    const res = this.clone();
    res.query((q) => q.top(1));
    return res.fetch(options).pipe(
      map(({ entities, annots }) => ({
        entity: entities !== null && entities.length === 1 ? entities[0] : null,
        annots,
      })),
    );
  }

  fetchEntities(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ) {
    return this.fetch(options).pipe(map(({ entities }) => entities));
  }

  fetchCollection(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
      CollectionType?: typeof ODataCollection;
    },
  ): Observable<ODataCollection<T, ODataModel<T> & ModelInterface<T>> | null>;
  fetchCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
      CollectionType?: typeof ODataCollection;
    },
  ): Observable<C | null>;
  fetchCollection(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
      CollectionType?: typeof ODataCollection;
    },
  ) {
    return this.fetch(options).pipe(
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
}
