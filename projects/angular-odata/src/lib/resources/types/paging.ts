import { concat, EMPTY, Observable, throwError } from 'rxjs';
import { catchError, expand, map, reduce } from 'rxjs/operators';
import type { ODataEntitiesAnnotations } from '../../annotations';
import type { ODataResource } from '../resource';
import type { ODataEntities } from '../response';
import type { ODataOptions } from './options';

/**
 * Internal request option. When set, a cache miss of a `cache-only` request
 * skips the api `errorHandler` and is passed straight to the caller.
 * Not part of the public API.
 */
export const SILENT_CACHE_MISS = Symbol('angular-odata:silentCacheMiss');

export type ODataPagedEntities<T> = {
  entities: T[];
  annots: ODataEntitiesAnnotations<T>;
};

/**
 * Follow the next links of a paged collection and aggregate every page in one result.
 *
 * Every page gets its own clone of the resource, so concurrent pages never share state.
 * With `cache-and-network` (and a cache configured) the pages are walked twice:
 * first from the cache (emitted only when every page is cached), then from the network.
 * Every other fetch policy is applied page by page and emits one aggregated result.
 * @param resource The resource for the first page, with its paging already set
 * @param fetch Fetch one page of the given resource with the given options
 * @param options Options for the requests
 * @returns The aggregated entities and annotations
 */
export function fetchPages<T, R extends ODataResource<any>>(
  resource: R,
  fetch: (resource: R, options: ODataOptions) => Observable<ODataEntities<T>>,
  options: ODataOptions = {},
): Observable<ODataPagedEntities<T>> {
  const api = resource.api;
  const policy = options.fetchPolicy ?? api.options.fetchPolicy;
  if (api.cache === undefined || policy !== 'cache-and-network') {
    return walkPages(resource, fetch, options);
  }
  const cached$ = walkPages(resource, fetch, {
    ...options,
    fetchPolicy: 'cache-only',
    [SILENT_CACHE_MISS]: true,
  } as ODataOptions).pipe(
    catchError((error) => (api.isCacheMiss(error) ? EMPTY : throwError(() => error))),
  );
  const network$ = walkPages(resource, fetch, { ...options, fetchPolicy: 'network-only' });
  return concat(cached$, network$);
}

function walkPages<T, R extends ODataResource<any>>(
  resource: R,
  fetch: (resource: R, options: ODataOptions) => Observable<ODataEntities<T>>,
  options: ODataOptions,
): Observable<ODataPagedEntities<T>> {
  const page = (res: R) => fetch(res, options).pipe(map((response) => ({ res, response })));
  return page(resource).pipe(
    expand(({ res, response: { annots } }) => {
      if (!(annots.skip || annots.skiptoken)) return EMPTY;
      const next = res.clone() as R;
      next.query((q) => q.paging(annots));
      return page(next);
    }),
    map(({ response: { entities, annots } }) => ({ entities: entities ?? [], annots })),
    reduce((acc, { entities, annots }) => ({
      entities: [...acc.entities, ...entities],
      annots: acc.annots.union(annots),
    })),
  );
}
