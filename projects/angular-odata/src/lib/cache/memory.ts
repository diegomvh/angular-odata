import { ODataRequest, ODataResponse } from '../resources';
import { ODataBaseCache } from './cache';

export class ODataInMemoryCache extends ODataBaseCache {
  constructor({ maxAge }: { maxAge?: number } = {}) {
    super({ maxAge });
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
}
