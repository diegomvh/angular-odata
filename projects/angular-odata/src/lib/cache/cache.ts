import { DEFAULT_TIMEOUT, CACHE_KEY_SEPARATOR } from '../constants';
import { Cache, PathSegmentNames } from '../types';
import {
  ODataBatchRequest,
  ODataBatchResource,
  ODataRequest,
  ODataResponse,
} from '../resources';
import { Observable, of, throwError } from 'rxjs';
import { startWith, tap } from 'rxjs/operators';

export interface ODataCacheEntry<T> {
  payload: T;
  lastRead: number;
  timeout: number;
  tags: string[];
}

export abstract class ODataCache implements Cache {
  timeout: number;
  entries: Map<string, ODataCacheEntry<any>>;
  constructor({ timeout = DEFAULT_TIMEOUT }: { timeout?: number }) {
    this.timeout = timeout;
    this.entries = new Map<string, ODataCacheEntry<any>>();
  }

  abstract getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined;
  abstract putResponse(req: ODataRequest<any>, res: ODataResponse<any>): void;

  scope(req: ODataRequest<any>): string[] {
    const segments = req.resource.cloneSegments();
    return segments.segments({ key: true }).reduce(
      (acc, s) => {
        if (s.name === PathSegmentNames.entitySet)
          acc = [...acc, s.path() as string];
        return acc;
      },
      ['request']
    );
  }

  tags(req: ODataRequest<any>, res: ODataResponse<any>): string[] {
    const tags = [];
    const context = res.context;
    if (context.entitySet) {
      tags.push(
        context.key ? `${context.entitySet}(${context.key})` : context.entitySet
      );
    }
    if (context.type) tags.push(context.type);
    return tags;
  }

  buildEntry<T>(
    payload: T,
    { timeout, tags }: { timeout?: number; tags?: string[] }
  ): ODataCacheEntry<T> {
    return {
      payload,
      lastRead: Date.now(),
      timeout: timeout || this.timeout,
      tags: tags || [],
    };
  }

  buildKey(names: string[]): string {
    return names.join(CACHE_KEY_SEPARATOR);
  }

  put<T>(
    name: string,
    payload: T,
    {
      timeout,
      scope,
      tags,
    }: { timeout?: number; scope?: string[]; tags?: string[] } = {}
  ) {
    const entry = this.buildEntry<T>(payload, { timeout, tags });
    const key = this.buildKey([...(scope || []), name]);
    this.entries.set(key, entry);
    this.forget();
  }

  get<T>(name: string, { scope }: { scope?: string[] } = {}): T {
    const key = this.buildKey([...(scope || []), name]);
    const entry = this.entries.get(key);
    return entry !== undefined && !this.isExpired(entry)
      ? entry.payload
      : undefined;
  }

  forget({
    name,
    scope = [],
    tags = [],
  }: { name?: string; scope?: string[]; tags?: string[] } = {}) {
    // Remove expired cache entries
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

  flush() {
    // Remove all cache entries
    this.entries = new Map<string, ODataCacheEntry<any>>();
  }

  isExpired(entry: ODataCacheEntry<any>) {
    return entry.lastRead < Date.now() - (entry.timeout || this.timeout) * 1000;
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
    const requests = req.isBatch()
      ? (req.resource as ODataBatchResource)
          .requests()
          .filter((r) => r.isMutate())
      : [req];
    for (var r of requests) {
      const scope = this.scope(r);
      this.forget({ scope });
    }
    return res$;
  }
}
