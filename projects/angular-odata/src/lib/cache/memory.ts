import { ODataRequest, ODataResponse } from '../resources';
import { ODataCache } from './cache';
export class ODataInMemoryCache extends ODataCache<ODataResponse<any>> {
  constructor(init?: {maxAge?: number}) {
    super(init);
  }

  putRequest(req: ODataRequest<any>, res: ODataResponse<any>) {
    this.put(req.urlWithParams, res, res.options.maxAge);
  }

  getRequest(req: ODataRequest<any>): ODataResponse<any> | undefined {
    return this.get(req.urlWithParams);
  }
}
