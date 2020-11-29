import { Observable, of, throwError } from 'rxjs';
import { startWith, tap } from 'rxjs/operators';
import { DEFAULT_MAX_AGE } from '../constants';
import { ODataRequest, ODataResponse } from '../resources';
import { CacheConfig } from '../types';
import { ODataCacheStorage } from './storage';

export class ODataCache {
  maxAge: number;
  storage: ODataCacheStorage;

  constructor(config: CacheConfig) {
    this.maxAge = config.maxAge || DEFAULT_MAX_AGE;
    this.storage = config.storage;
  }

  isCacheable(req: ODataRequest<any>) {
    return req.method === 'GET';
  }

  handle(req: ODataRequest<any>, res$: Observable<ODataResponse<any>>): Observable<ODataResponse<any>> {
    const policy = req.fetchPolicy;
    const cached = this.storage.get(req, {maxAge: this.maxAge});
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
      res$ = res$.pipe(tap((res: ODataResponse<any>) => this.storage.put(req, res)));
    }
    return cached ?
      (policy === 'cache-and-network' ? res$.pipe(startWith(cached)) : of(cached)) :
      res$;
  }

}
