import { Observable, of, throwError } from 'rxjs';
import { startWith, tap } from 'rxjs/operators';
import { DEFAULT_MAX_AGE } from '../constants';
import { Cache } from '../types';
import { ODataRequest, ODataResponse } from '../resources';

export interface ODataCacheEntry<T> {
  payload: T;
  lastRead: number;
  maxAge?: number;
}

export abstract class ODataCache<T> implements Cache<T> {
  maxAge: number;
  entries: Map<string, ODataCacheEntry<T>>;
  constructor(init?: {maxAge?: number}) {
    this.maxAge = init?.maxAge || DEFAULT_MAX_AGE;
    this.entries = new Map<string, ODataCacheEntry<T>>();
  }
  abstract getRequest(req: ODataRequest<any>): ODataResponse<any> | undefined;
  abstract putRequest(req: ODataRequest<any>, res: ODataResponse<any>): void;

  buildEntry(payload: T, maxAge?: number) {
    return {
      payload,
      lastRead: Date.now(),
      maxAge: maxAge
    };
  }

  put(key: string, payload: T, maxAge?: number) {
    const entry = {
      payload,
      lastRead: Date.now(),
      maxAge: maxAge
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
    return entry.lastRead < (Date.now() - (entry.maxAge || this.maxAge));
  }

  isCacheable(req: ODataRequest<any>) {
    return req.observe === 'response' && req.method === 'GET';
  }

  handle(req: ODataRequest<any>, res$: Observable<ODataResponse<any>>): Observable<ODataResponse<any>> {
    const policy = req.fetchPolicy;
    const cached = this.getRequest(req);
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
      res$ = res$.pipe(tap((res: ODataResponse<any>) => this.putRequest(req, res)));
    }
    return (cached !== undefined && policy !== 'network-only') ?
      (policy === 'cache-and-network' ? res$.pipe(startWith(cached)) : of(cached)) :
      res$;
  }
}
