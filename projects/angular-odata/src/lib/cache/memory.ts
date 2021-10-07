import type { ODataRequest, ODataResponse } from '../resources';

import { ODataCache } from './cache';

export class ODataInMemoryCache extends ODataCache {
  constructor({ timeout }: { timeout?: number } = {}) {
    super({ timeout });
  }

  putResponse(req: ODataRequest<any>, res: ODataResponse<any>) {
    var scope = this.scope(req);
    var tags = this.tags(req, res);
    this.put(req.pathWithParams, res, {
      timeout: res.options.maxAge,
      scope,
      tags,
    });
  }

  getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined {
    var scope = this.scope(req);
    return this.get(req.pathWithParams, { scope });
  }
}
