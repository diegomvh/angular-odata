import { ODataRequest, ODataResponse } from '../resources';
import { ODataCache } from './cache';
export class ODataInMemoryCache extends ODataCache<ODataResponse<any>> {
  constructor(init?: {maxAge?: number}) {
    super(init);
  }

  put(req: ODataRequest<any>, res: ODataResponse<any>) {
    const entry = this.buildEntry(res, res.options.maxAge);
    this.setEntry(req.urlWithParams, entry);
  }

  get(req: ODataRequest<any>): ODataResponse<any> | undefined {
    return this.getEntry(req.urlWithParams)?.payload;
  }
}
