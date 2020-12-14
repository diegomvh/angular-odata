import { Observable, of, throwError } from 'rxjs';
import { startWith, tap } from 'rxjs/operators';
import { DEFAULT_TIMEOUT } from '../constants';
import { Cache } from '../types';
import { ODataRequest, ODataResponse } from '../resources';

export interface ODataCacheEntry<T> {
  payload: T;
  lastRead: number;
  timeout?: number;
}

export abstract class ODataCache<T> implements Cache<T> {
  timeout: number;
  entries: Map<string, ODataCacheEntry<T>>;
  constructor(init?: {timeout?: number}) {
    this.timeout = init?.timeout || DEFAULT_TIMEOUT;
    this.entries = new Map<string, ODataCacheEntry<T>>();
  }
  abstract getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined;
  abstract putResponse(req: ODataRequest<any>, res: ODataResponse<any>): void;

  buildEntry(payload: T, timeout?: number) {
    return {
      payload,
      lastRead: Date.now(),
      timeout: timeout
    };
  }

  put(key: string, payload: T, timeout?: number) {
    const entry = {
      payload,
      lastRead: Date.now(),
      timeout: timeout
    } as ODataCacheEntry<T>;
    this.entries.set(key, entry);
    this.remove();
  }

  get(key: string) {
    const entry = this.entries.get(key);
    return entry !== undefined && !this.isExpired(entry) ? entry.payload : undefined;
  }

  private remove() {
    // remove expired cache entries
    this.entries.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        this.entries.delete(key);
      }
    });
  }

  isExpired(entry: ODataCacheEntry<any>) {
    return entry.lastRead < (Date.now() - ((entry.timeout || this.timeout) * 1000));
  }

  isCacheable(req: ODataRequest<any>) {
    return req.observe === 'response' && req.method === 'GET';
  }

  handleRequest(req: ODataRequest<any>, res$: Observable<ODataResponse<any>>): Observable<ODataResponse<any>> {
    const policy = req.fetchPolicy;
    const cached = this.getResponse(req);
    if (policy === 'no-cache') {
      return res$;
    }
    if (policy === 'cache-only') {
      if (cached) {
        return of(cached);
      } else {
        return throwError("No Cached");
      }
    }
    if (policy === 'cache-first' || policy === 'cache-and-network' || policy === 'network-only') {
      res$ = res$.pipe(tap((res: ODataResponse<any>) => {
        if (res.options.cacheability !== 'no-store')
          this.putResponse(req, res);
      }));
    }
    return (cached !== undefined && policy !== 'network-only') ?
      (policy === 'cache-and-network' ? res$.pipe(startWith(cached)) : of(cached)) :
      res$;
  }
}
