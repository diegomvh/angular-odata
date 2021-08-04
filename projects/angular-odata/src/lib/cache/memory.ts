import type { ODataRequest, ODataResponse } from '../resources';
import { ODataCache } from './cache';
export class ODataInMemoryCache extends ODataCache<ODataResponse<any>> {
  constructor({ timeout }: { timeout?: number } = {}) {
    super({ timeout });
  }

  putResponse(req: ODataRequest<any>, res: ODataResponse<any>) {
    this.put(req.pathWithParams, res, {
      timeout: res.options.maxAge,
      pattern: `^${req.path}`,
    });
  }

  getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined {
    return this.get(req.pathWithParams);
  }
}
