import { ODataRequest, ODataResponse, ODataResponseJson } from '../resources';
import { ODataBaseCache, ODataCacheEntry } from './cache';

export class ODataInStorageCache extends ODataBaseCache {
  name: string;
  storage: Storage;

  constructor({
    name,
    storage = sessionStorage,
    maxAge,
  }: {
    maxAge?: number;
    name: string;
    storage?: Storage;
  }) {
    super({ maxAge });
    this.name = name;
    this.storage = storage;
    this.restore();
    window.addEventListener('beforeunload', () => this.store());
  }

  /**
   * Store the cache in the storage
   */
  store() {
    this.storage.setItem(
      this.name,
      JSON.stringify(
        Array.from(this.entries.entries()).map(([key, entry]) => [
          key,
          {
            ...entry,
            payload:
              entry.payload instanceof ODataResponse ? entry.payload.toJson() : entry.payload,
          } as ODataCacheEntry<any>,
        ]),
      ),
    );
  }

  /**
   * Restore the cache from the storage
   */
  restore() {
    this.entries = new Map<string, ODataCacheEntry<any>>(
      JSON.parse(this.storage.getItem(this.name) || '[]'),
    );
  }

  /**
   * Flush the cache and clean the storage
   */
  override flush() {
    super.flush();
    this.store();
  }

  /**
   * Store the response in the cache
   * @param req The request with the resource to store the response
   * @param res The response to store in the cache
   */
  putResponse(req: ODataRequest<any>, res: ODataResponse<any>) {
    const scope = this.scope(req);
    const tags = this.tags(res);
    this.put<ODataResponse<any>>(req.cacheKey, res, {
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
  getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined {
    const scope = this.scope(req);
    const data = this.get<ODataResponseJson<any>>(req.cacheKey, { scope });

    return data instanceof ODataResponse
      ? data
      : data !== undefined
        ? ODataResponse.fromJson(req, data)
        : undefined;
  }
}
