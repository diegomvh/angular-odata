import { Observable, of, throwError } from 'rxjs';
import { startWith, tap } from 'rxjs/operators';
import { CACHE_KEY_SEPARATOR, DEFAULT_MAXAGE } from '../constants';
import type { EntityKey, ODataBatchResource } from '../resources';
import { ODataRequest, ODataResponse } from '../resources';
import { ODataCache, PathSegment } from '../types';
import { ODataModel, ODataModelOptions } from '../models';

/**
 * A cache entry that holds a payload, a date when it was last read from the backend, and a maxAge for the entry.
 * @param payload The payload to cache.
 * @param date The date when the entry was last read from the backend.
 * @param maxAge The maximum age for the entry.
 * @param tags Some tags to identify the entry.
 */
export interface ODataCacheEntry<T> {
  payload: T;
  date: number;
  maxAge: number;
  tags: string[];
}

export abstract class ODataBaseCache implements ODataCache {
  maxAge: number;
  entries: Map<string, ODataCacheEntry<any>>;

  constructor({ maxAge = DEFAULT_MAXAGE }: { maxAge?: number }) {
    this.maxAge = maxAge;
    this.entries = new Map<string, ODataCacheEntry<any>>();
  }
  abstract getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined;
  abstract putResponse(req: ODataRequest<any>, res: ODataResponse<any>): void;
  abstract getModel(key: EntityKey<any>, options: ODataModelOptions<any>): ODataModel<any> | undefined;
  abstract putModel(key: EntityKey<any>, model: ODataModel<any>): void;

  /**
   * Using the resource on the request build an array of string to identify the scope of the request
   * @param obj The request with the resource to build the scope
   * @returns Array of string to identify the scope of the request
   */
  scope(obj: ODataRequest<any> | ODataModelOptions<any>): string[] {
    if (obj instanceof ODataRequest) {
      const segments = obj.resource.cloneSegments();
      return segments.segments({ key: true }).reduce(
        (acc, s) => {
          if (s.name === PathSegment.entitySet) acc = [...acc, s.path() as string];
          return acc;
        },
        ['request'],
      ); 
    } else if (obj instanceof ODataModelOptions) {
      return ['model', obj.name, obj.type()];
    }
    return [];
  }

  /**
   * Using the odata context on the response build an array of string to identify the tags of the response
   * @param res The response to build the tags
   * @returns Array of string to identify the tags of the response
   */
  tags(obj: ODataResponse<any> | ODataModelOptions<any>): string[] {
    const tags = [];
    if (obj instanceof ODataResponse) {
      const context = obj.context;
      if (context.entitySet) {
        tags.push(context.key ? `${context.entitySet}(${context.key})` : context.entitySet);
      }
      if (context.type) tags.push(context.type);
    } else if (obj instanceof ODataModelOptions) {
      tags.push(obj.name);
    }
    return tags;
  }

  /**
   * Build an entry from a payload and some options
   * @param payload The payload to store in the cache
   * @param maxAge The maximum age for the entry
   * @param tags The tags for the entry
   * @returns The entry to store in the cache
   */
  buildEntry<T>(
    payload: T,
    { maxAge, tags }: { maxAge?: number; tags?: string[] },
  ): ODataCacheEntry<T> {
    return {
      payload,
      date: Date.now(),
      maxAge: (maxAge ?? this.maxAge) * 1000,
      tags: tags ?? [],
    };
  }

  /**
   * Build a key from store an entry in the cache
   * @param names The names of the entry
   * @returns The key for the entry
   */
  buildKey(names: string[]): string {
    return names.join(CACHE_KEY_SEPARATOR);
  }

  /**
   * Put some payload in the cache
   * @param name The name for the entry
   * @param payload The payload to store in the cache
   * @param maxAge The maximum age for the entry
   * @param scope The scope for the entry
   * @param tags The tags for the entry
   */
  put<T>(
    name: string,
    payload: T,
    { maxAge, scope, tags }: { maxAge?: number; scope?: string[]; tags?: string[] } = {},
  ) {
    const entry = this.buildEntry<T>(payload, { maxAge, tags });
    const key = this.buildKey([...(scope ?? []), name]);
    this.entries.set(key, entry);
  }

  /**
   * Return the payload from the cache if it exists and is not expired
   * @param name The name of the entry
   * @param scope The scope of the entry
   * @returns The payload of the entry
   */
  get<T>(name: string, { scope }: { scope?: string[] } = {}): T | undefined {
    const key = this.buildKey([...(scope || []), name]);
    const entry = this.entries.get(key);
    return entry !== undefined && !this.isExpired(entry) ? entry.payload : undefined;
  }

  /**
   * Remove all cache entries that are matching with the given options
   * @param options The options to forget
   */
  forget({
    name,
    scope = [],
    tags = [],
  }: { name?: string; scope?: string[]; tags?: string[] } = {}) {
    if (name !== undefined) scope.push(name);
    const key = scope.length > 0 ? this.buildKey(scope) : undefined;
    this.entries.forEach((entry, k) => {
      if (
        this.isExpired(entry) || // Expired
        (key !== undefined && k.startsWith(key)) || // Key
        (tags.length > 0 && tags.some((t) => entry.tags.indexOf(t) !== -1)) // Tags
      ) {
        this.entries.delete(k);
      }
    });
  }

  /**
   * Remove all cache entries
   */
  flush() {
    this.entries = new Map<string, ODataCacheEntry<any>>();
  }

  /**
   * Check if the entry is expired
   * @param entry The cache entry
   * @returns Boolean indicating if the entry is expired
   */
  isExpired(entry: ODataCacheEntry<any>) {
    return entry.date < (Date.now() - entry.maxAge);
  }

  /**
   * Using the request, handle the fetching of the response
   * @param req The request to fetch
   * @param res$ Observable of the response
   * @returns
   */
  handleRequest(
    req: ODataRequest<any>,
    res$: Observable<ODataResponse<any>>,
  ): Observable<ODataResponse<any>> {
    return req.isFetch()
      ? this.handleFetch(req, res$)
      : req.isMutate()
        ? this.handleMutate(req, res$)
        : res$;
  }

  private handleFetch(
    req: ODataRequest<any>,
    res$: Observable<ODataResponse<any>>,
  ): Observable<ODataResponse<any>> {
    const policy = req.fetchPolicy;
    const cached = this.getResponse(req);
    if (policy === 'no-cache') {
      return res$;
    }
    if (policy === 'cache-only') {
      if (cached) {
        return of(cached);
      } else {
        return throwError(() => new Error('No Cached'));
      }
    }
    if (policy === 'cache-first' || policy === 'cache-and-network' || policy === 'network-only') {
      res$ = res$.pipe(
        tap((res: ODataResponse<any>) => {
          if (res.options.cacheability !== 'no-store') this.putResponse(req, res);
        }),
      );
    }
    return cached !== undefined && policy !== 'network-only'
      ? policy === 'cache-and-network'
        ? res$.pipe(startWith(cached))
        : of(cached)
      : res$;
  }

  private handleMutate(
    req: ODataRequest<any>,
    res$: Observable<ODataResponse<any>>,
  ): Observable<ODataResponse<any>> {
    const requests = req.isBatch()
      ? (req.resource as ODataBatchResource).requests().filter((r) => r.isMutate())
      : [req];
    for (var r of requests) {
      const scope = this.scope(r);
      this.forget({ scope });
    }
    return res$;
  }
}
