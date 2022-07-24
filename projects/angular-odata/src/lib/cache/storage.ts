import { ODataRequest, ODataResponse } from '../resources';
import { ODataCache, ODataCacheEntry } from './cache';

interface ResponseJson {
  body: any | null;
  headers: { [name: string]: string | string[] };
  status: number;
  statusText: string;
  url: string | null;
}

export class ODataInStorageCache extends ODataCache {
  name: string;
  storage: Storage;

  constructor({
    name,
    storage = sessionStorage,
    timeout,
  }: {
    timeout?: number;
    name: string;
    storage?: Storage;
  }) {
    super({ timeout });
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
      JSON.stringify(Array.from(this.entries.entries()))
    );
  }

  /**
   * Restore the cache from the storage
   */
  restore() {
    this.entries = new Map<string, ODataCacheEntry<any>>(
      JSON.parse(this.storage.getItem(this.name) || '[]')
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
    this.put<ResponseJson>(req.cacheKey, res.toJSON(), {
      timeout: res.options.maxAge,
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
    const data = this.get<ResponseJson>(req.cacheKey, { scope });

    return data !== undefined ? ODataResponse.fromJSON(req, data) : undefined;
  }
}
