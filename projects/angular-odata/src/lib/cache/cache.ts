import { CACHE_KEY_SEPARATOR, DEFAULT_MAXAGE } from '../constants';
import type { ODataRequest, ODataResponse } from '../resources';
import { ODataCache, PathSegment } from '../types';

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

  constructor({ maxAge = DEFAULT_MAXAGE }: { maxAge?: number }) {
    this.maxAge = maxAge;
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
   * Using the resource on the request build an array of string to identify the scope of the request
   * @param req The request with the resource to build the scope
   * @returns Array of string to identify the scope of the request
   */
  scope(req: ODataRequest<any>): string[] {
    const segments = req.resource.cloneSegments();
    return segments.segments({ key: true }).reduce(
      (acc, s) => {
        if (s.name === PathSegment.entitySet) acc = [...acc, s.path() as string];
        return acc;
      },
      ['request'],
    );
  }

  /**
   * Using the odata context on the response build an array of string to identify the tags of the response
   * @param res The response to build the tags
   * @returns Array of string to identify the tags of the response
   */
  tags(res: ODataResponse<any>): string[] {
    const tags = [];
    const context = res.context;
    if (context.entitySet) {
      tags.push(context.key ? `${context.entitySet}(${context.key})` : context.entitySet);
    }
    if (context.type) tags.push(context.type);
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

  abstract put<T>(name: string, payload: T, { maxAge, scope, tags }: { maxAge?: number; scope?: string[]; tags?: string[] }): void;
  abstract get<T>(name: string, { scope }: { scope?: string[] }): T | undefined;
  abstract getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined;
  abstract putResponse(req: ODataRequest<any>, res: ODataResponse<any>): void;
  abstract forget({ name, scope, tags}: { name?: string; scope?: string[]; tags?: string[] }): void;
  abstract flush(): void;

}
