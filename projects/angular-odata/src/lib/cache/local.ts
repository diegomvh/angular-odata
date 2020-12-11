import { ODataRequest, ODataResponse } from '../resources';
import { ODataCacheStorage } from './storage';

export interface ODataCacheLocalStorageEntry {
  url: string;
  response: {
    body: any | null;
    headers: {[name: string]: string | string[]};
    status: number;
    statusText: string;
    url: string;
  };
  lastRead: number;
}

export class ODataCacheLocalStorage extends ODataCacheStorage {
  backend: any;
  responses: Map<string, ODataCacheLocalStorageEntry>;

  constructor(name: string, backend: any = sessionStorage) {
    super();
    this.responses = new Map<string, ODataCacheLocalStorageEntry>(JSON.parse(backend.getItem(name) || "[]"));
    window.addEventListener("beforeunload", ((backend, key, responses) => function() {
      backend.setItem(key, JSON.stringify(Array.from(responses.entries())))
    })(backend, name, this.responses));
  }

  put(req: ODataRequest<any>, res: ODataResponse<any>) {
    const url = req.urlWithParams;

    const newEntry = {
      url,
      response: res.toJSON(),
      lastRead: Date.now() } as ODataCacheLocalStorageEntry;
    this.responses.set(url, newEntry);
  }

  remove(options: {maxAge: number}) {
    // remove expired cache entries
    const expired = Date.now() - options.maxAge;
    this.responses.forEach(entry => {
      if (entry.lastRead < expired) {
        this.responses.delete(entry.url);
      }
    });
  }

  get(req: ODataRequest<any>, options: {maxAge: number}): ODataResponse<any> | undefined {
    const url = req.urlWithParams;
    const cached = this.responses.get(url);

    if (!cached) {
      return undefined;
    }

    const isExpired = cached.lastRead < (Date.now() - options.maxAge);
    return isExpired ? undefined : ODataResponse.fromJSON(req, cached.response);
  }
}
