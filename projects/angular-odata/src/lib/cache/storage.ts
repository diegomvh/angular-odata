import { ODataCache, ODataCacheEntry } from './cache';
import { ODataRequest, ODataResponse } from '../resources';

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

  store() {
    this.storage.setItem(
      this.name,
      JSON.stringify(Array.from(this.entries.entries()))
    );
  }

  restore() {
    this.entries = new Map<string, ODataCacheEntry<any>>(
      JSON.parse(this.storage.getItem(this.name) || '[]')
    );
  }

  flush() {
    super.flush();
    this.store();
  }

  putResponse(req: ODataRequest<any>, res: ODataResponse<any>) {
    const scope = this.scope(req);
    const tags = this.tags(req, res);
    this.put<ResponseJson>(req.pathWithParams, res.toJSON(), {
      timeout: res.options.maxAge,
      scope,
      tags,
    });
  }

  getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined {
    const scope = this.scope(req);
    const data = this.get<ResponseJson>(req.pathWithParams, { scope });

    return data !== undefined ? ODataResponse.fromJSON(req, data) : undefined;
  }
}
