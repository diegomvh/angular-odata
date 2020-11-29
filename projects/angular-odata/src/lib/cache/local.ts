import { HttpHeaders } from '@angular/common/http';
import { ODataRequest, ODataResponse } from '../resources';
import { ODataCacheStorage } from './storage';

export interface ODataCacheLocalStorageEntry {
  url: string;
  response: {
    body: any | null;
    headers: {[name: string]: string | string[]};
    status: number;
    statusText: string;
  };
  lastRead: number;
}

export class ODataCacheLocalStorage extends ODataCacheStorage {
  responses: Map<string, ODataCacheLocalStorageEntry>;

  constructor(maxAge: number, name: string) {
    super(maxAge);
    this.responses = new Map<string, ODataCacheLocalStorageEntry>(JSON.parse(localStorage.getItem(name) || "[]"));
    window.addEventListener("beforeunload", ((key, responses) => function() {
      localStorage.setItem(key, JSON.stringify(Array.from(responses.entries())))
    })(name, this.responses));
  }

  put(req: ODataRequest<any>, response: ODataResponse<any>) {
    const url = req.urlWithParams;

    const newEntry = {
      url,
      response: {
        body: response.body,
        headers: response.headers.keys()
          .map(name => ({[name]: response.headers.getAll(name)}))
          .reduce((acc, header) => Object.assign(acc, header), {}),
        status: response.status,
        statusText: response.statusText
      },
      lastRead: Date.now() } as ODataCacheLocalStorageEntry;
    this.responses.set(url, newEntry);

    // remove expired cache entries
    const expired = Date.now() - this.maxAge;
    this.responses.forEach(entry => {
      if (entry.lastRead < expired) {
        this.responses.delete(entry.url);
      }
    });
  }

  get(req: ODataRequest<any>): ODataResponse<any> | undefined {
    const url = req.urlWithParams;
    const cached = this.responses.get(url);

    if (!cached) {
      return undefined;
    }

    const isExpired = cached.lastRead < (Date.now() - this.maxAge);
    return isExpired ? undefined : new ODataResponse<any>({
      api: req.api,
      body: cached.response.body,
      headers: new HttpHeaders(cached.response.headers),
      status: cached.response.status,
      statusText: cached.response.statusText,
      resource: req.resource
    });
  }
}
