import { ODataRequest, ODataResponse } from '../resources';
import { ODataBaseCache, ODataCacheEntry } from './cache';

export class ODataInMemoryCache extends ODataBaseCache {
  entries: Map<string, ODataCacheEntry<any>>;
  constructor({ maxAge }: { maxAge?: number } = {}) {
    super({ maxAge });
    this.entries = new Map<string, ODataCacheEntry<any>>();
  }

  /**
   * Put some payload in the cache
   * @param name The name for the entry
   * @param payload The payload to store in the cache
   * @param maxAge The maximum age for the entry
   * @param scope The scope for the entry
   * @param tags The tags for the entry
   */
  override put<T>(
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
  override get<T>(name: string, { scope }: { scope?: string[] } = {}): T | undefined {
    const key = this.buildKey([...(scope || []), name]);
    const entry = this.entries.get(key);
    return entry !== undefined && !this.isExpired(entry) ? entry.payload : undefined;
  }

  /**
   * Store the response in the cache
   * @param req The request with the resource to store the response
   * @param res The response to store in the cache
   */
  override putResponse(req: ODataRequest<any>, res: ODataResponse<any>) {
    let scope = this.scope(req);
    let tags = this.tags(res);
    this.put(req.cacheKey, res, {
      maxAge: req.maxAge ?? res.options.maxAge,
      scope,
      tags,
    });
  }

  /**
   * Restore the response from the cache
   * @param req The request with the resource to get the response
   * @returns The response from the cache
   */
  override getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined {
    let scope = this.scope(req);
    return this.get(req.cacheKey, { scope });
  }

  /**
   * Remove all cache entries that are matching with the given options
   * @param options The options to forget
   */
  override forget({
    name,
    scope = [],
    tags = [],
  }: { name?: string, scope?: string[]; tags?: string[] } = {}) {
    if (name) scope.push(name);
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
  override flush() {
    this.entries = new Map<string, ODataCacheEntry<any>>();
  }

  override size() {
    return this.entries.size;
  }
}
