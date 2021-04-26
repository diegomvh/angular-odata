import { ODataRequest, ODataResponse } from '../resources';
import { ODataCache } from './cache';
export class ODataInMemoryCache extends ODataCache<ODataResponse<any>> {
  constructor(init?: {timeout?: number}) {
    super(init);
  }

  putResponse(req: ODataRequest<any>, res: ODataResponse<any>) {
    this.put(req.pathWithParams, res, res.options.maxAge);
  }

  getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined {
    return this.get(req.pathWithParams);
  }
}
