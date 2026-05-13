import { ODataRequest, ODataResponse, ODataResponseJson } from '../resources';
import { ODataBaseCache, ODataCacheEntry } from './cache';

export class ODataInStorageCache extends ODataBaseCache {
  prefix: string;
  storage: Storage;

  constructor({
    prefix,
    storage = sessionStorage,
    maxAge,
  }: {
    maxAge?: number;
    prefix: string;
    storage?: Storage;
  }) {
    super({ maxAge });
    this.prefix = prefix;
    this.storage = storage;
  }

  override buildKey(names: string[]): string {
    return super.buildKey([this.prefix, ...names]);
  }

  override put<T>(
    name: string,
    payload: T,
    { maxAge, scope, tags }: { maxAge?: number; scope?: string[]; tags?: string[] } = {},
  ) {
    const entry = this.buildEntry<T>(payload, { maxAge, tags });
    const key = this.buildKey([...(scope ?? []), name]);
    this.storage.setItem(key, JSON.stringify(entry));
  }

  override get<T>(name: string, { scope }: { scope?: string[] } = {}): T | undefined {
    const key = this.buildKey([...(scope || []), name]);
    const entry = JSON.parse(this.storage.getItem(key) ?? "{}");
    return entry !== undefined && !this.isExpired(entry) ? entry.payload : undefined;
  }

  override forget({
    name,
    scope = [],
    tags = [],
  }: { name?: string, scope?: string[]; tags?: string[] }) {
    if (name) scope.push(name);
    const key = scope.length > 0 ? this.buildKey(scope) : undefined;
    Object.keys(this.storage).filter(k => k.startsWith(this.prefix)).forEach(k => {
      const entry = JSON.parse(this.storage.getItem(k) ?? "{}");
      if (
        this.isExpired(entry) || // Expired
        (key !== undefined && k.startsWith(key)) || // Key
        (tags.length > 0 && tags.some((t) => entry.tags.indexOf(t) !== -1)) // Tags
      ) {
        this.storage.removeItem(k);
      }
    });
  }

  /**
   * Flush the cache and clean the storage
   */
  override flush() {
    Object.keys(this.storage).filter(k => k.startsWith(this.prefix)).forEach(k => {
      this.storage.removeItem(k);
    });
  }

  /**
   * Store the response in the cache
   * @param req The request with the resource to store the response
   * @param res The response to store in the cache
   */
  override putResponse(req: ODataRequest<any>, res: ODataResponse<any>) {
    const scope = this.scope(req);
    const tags = this.tags(res);
    this.put<ODataResponseJson<any>>(req.cacheKey, res.toJson(), {
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
    const scope = this.scope(req);
    const data = this.get<ODataResponseJson<any>>(req.cacheKey, { scope });

    return data !== undefined ? ODataResponse.fromJson(req, data) : undefined;
  }
}
