import { DEFAULT_TIMEOUT } from '../constants';
import { Cache } from '../types';
import { ODataRequest, ODataResponse } from '../resources';
import { Observable, of, throwError } from 'rxjs';
import { startWith, tap } from 'rxjs/operators';

//TODO: User cache? Tags cache?
export interface ODataCacheEntry<T> {
  payload: T;
  lastRead: number;
  tags?: string[];
  timeout?: number;
}

export abstract class ODataCache<T> implements Cache<T> {
  timeout: number;
  entries: Map<string, ODataCacheEntry<T>>;
  constructor({ timeout = DEFAULT_TIMEOUT }: { timeout?: number }) {
    this.timeout = timeout;
    this.entries = new Map<string, ODataCacheEntry<T>>();
  }

  abstract getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined;
  abstract putResponse(req: ODataRequest<any>, res: ODataResponse<any>): void;

  buildEntry(
    payload: T,
    { timeout, tags }: { timeout?: number; tags?: string[] }
  ): ODataCacheEntry<T> {
    return {
      payload,
      lastRead: Date.now(),
      tags,
      timeout: timeout || this.timeout,
    };
  }

  put(
    key: string,
    payload: T,
    { timeout, tags }: { timeout?: number; tags?: string[] }
  ) {
    const entry = this.buildEntry(payload, { timeout, tags });
    console.log('Caching', entry);
    this.entries.set(key, entry);
    this.forget();
  }

  get(key: string) {
    const entry = this.entries.get(key);
    return entry !== undefined && !this.isExpired(entry)
      ? entry.payload
      : undefined;
  }

  forget({ key, tags }: { key?: string, tags?: string[] } = {}) {
    // Remove expired cache entries
    this.entries.forEach((e, k) => {
      if (
        key !== undefined && k === key ||
        this.isExpired(e) || // Expired
        (tags !== undefined && this.isMatch(e, tags)) // Match
      ) {
        console.log('Forgetting', e);
        this.entries.delete(k);
      }
    });
  }

  flush() {
    // Remove all cache entries
    this.entries = new Map<string, ODataCacheEntry<T>>();
  }

  isExpired(entry: ODataCacheEntry<any>) {
    return entry.lastRead < Date.now() - (entry.timeout || this.timeout) * 1000;
  }

  isMatch(entry: ODataCacheEntry<any>, tags: string[]) {
    return entry.tags !== undefined && entry.tags.every((t) => t in tags);
  }

  handleRequest(
    req: ODataRequest<any>,
    res$: Observable<ODataResponse<any>>
  ): Observable<ODataResponse<any>> {
    return req.isFetch()
      ? this.handleFetch(req, res$)
      : req.isMutate()
      ? this.handleMutate(req, res$)
      : res$;
  }

  private handleFetch(
    req: ODataRequest<any>,
    res$: Observable<ODataResponse<any>>
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
        return throwError('No Cached');
      }
    }
    if (
      policy === 'cache-first' ||
      policy === 'cache-and-network' ||
      policy === 'network-only'
    ) {
      res$ = res$.pipe(
        tap((res: ODataResponse<any>) => {
          if (res.options.cacheability !== 'no-store')
            this.putResponse(req, res);
        })
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
    res$: Observable<ODataResponse<any>>
  ): Observable<ODataResponse<any>> {
    var segments = req.resource.cloneSegments();
    var path = segments.first()?.path();
    var tags = ['response'];
    if (path !== undefined) {
      tags.push(path);
    }
    this.forget({ tags });
    return res$;
  }
}
