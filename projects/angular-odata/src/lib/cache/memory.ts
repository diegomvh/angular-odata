import { ODataRequest, ODataResponse } from '../resources';
import { ODataCacheStorage } from './storage';

export interface ODataCacheMemoryStorageEntry {
  url: string;
  response: ODataResponse<any>;
  lastRead: number;
}

export class ODataCacheMemoryStorage extends ODataCacheStorage {
  responses = new Map<string, ODataCacheMemoryStorageEntry>();

  put(req: ODataRequest<any>, response: ODataResponse<any>) {
    const url = req.urlWithParams;

    const newEntry = { url, response, lastRead: Date.now() };
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

  get(req: ODataRequest<any>, options: { maxAge: number }): ODataResponse<any> | undefined {
    const url = req.urlWithParams;
    const cached = this.responses.get(url);

    if (!cached) {
      return undefined;
    }

    const isExpired = cached.lastRead < (Date.now() - options.maxAge);
    return isExpired ? undefined : cached.response;
  }
}
