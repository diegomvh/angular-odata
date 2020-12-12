import { ODataRequest, ODataResponse } from '../resources';
import { ODataCache, ODataCacheEntry } from './cache';
interface StoragePayload {
    body: any | null;
    headers: {[name: string]: string | string[]};
    status: number;
    statusText: string;
    url: string | null;
}

export class ODataInStorageCache extends ODataCache<StoragePayload> {
  constructor(init: {maxAge?: number, name: string, storage?: Storage}) {
    super(init);
    const name = init.name;
    const storage = init.storage || sessionStorage;
    this.entries = new Map<string, ODataCacheEntry<StoragePayload>>(JSON.parse(storage.getItem(name) || "[]"));
    window.addEventListener("beforeunload", ((backend, key, responses) => function() {
      backend.setItem(key, JSON.stringify(Array.from(responses.entries())))
    })(storage, name, this.entries));
  }

  put(req: ODataRequest<any>, res: ODataResponse<any>) {
    const entry = this.buildEntry(res.toJSON(), res.options.maxAge);
    this.setEntry(req.urlWithParams, entry);
  }

  get(req: ODataRequest<any>): ODataResponse<any> | undefined {
    const entry = this.getEntry(req.urlWithParams);

    return entry !== undefined ? ODataResponse.fromJSON(req, entry.payload) : undefined;
  }
}
