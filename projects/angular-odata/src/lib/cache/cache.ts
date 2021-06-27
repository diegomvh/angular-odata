import { Observable, of, throwError } from 'rxjs';
import { startWith, tap } from 'rxjs/operators';
import { DEFAULT_TIMEOUT } from '../constants';
import { Cache } from '../types';
import { ODataRequest, ODataResponse } from '../resources';

//TODO: User cache? Tags cache?
export interface ODataCacheEntry<T> {
  payload: T;
  lastRead: number;
  pattern?: string;
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
    { timeout, pattern }: { timeout?: number; pattern?: string }
  ): ODataCacheEntry<T> {
    return {
      payload,
      lastRead: Date.now(),
      pattern,
      timeout,
    };
  }

  put(
    key: string,
    payload: T,
    { timeout, pattern }: { timeout?: number; pattern?: string }
  ) {
    const entry = this.buildEntry(payload, { timeout, pattern });
    this.entries.set(key, entry);
    this.forget();
  }

  get(key: string) {
    const entry = this.entries.get(key);
    return entry !== undefined && !this.isExpired(entry)
      ? entry.payload
      : undefined;
  }

  forget({ name }: { name?: string } = {}) {
    // Remove expired cache entries
    this.entries.forEach((entry, key) => {
      if (
        this.isExpired(entry) || // Expired
        (name && this.isMatch(entry, name)) // Match
      )
        this.entries.delete(key);
    });
  }

  flush() {
    // Remove all cache entries
    this.entries = new Map<string, ODataCacheEntry<T>>();
  }

  isExpired(entry: ODataCacheEntry<any>) {
    return entry.lastRead < Date.now() - (entry.timeout || this.timeout) * 1000;
  }

  isMatch(entry: ODataCacheEntry<any>, value: string) {
    return entry.pattern !== undefined && value.match(entry.pattern);
  }

  isCacheable(req: ODataRequest<any>) {
    return req.observe === 'response';
  }

  isFetch(req: ODataRequest<any>) {
    return ['GET'].indexOf(req.method) !== -1;
  }

  isMutate(req: ODataRequest<any>) {
    return ['PUT', 'PATCH', 'POST', 'DELETE'].indexOf(req.method) !== -1;
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
    this.forget({ name: req.path });
    return res$;
  }

  handleRequest(
    req: ODataRequest<any>,
    res$: Observable<ODataResponse<any>>
  ): Observable<ODataResponse<any>> {
    return this.isFetch(req)
      ? this.handleFetch(req, res$)
      : this.isMutate(req)
      ? this.handleMutate(req, res$)
      : res$;
  }
}
