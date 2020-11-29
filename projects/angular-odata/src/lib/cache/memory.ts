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
    return isExpired ? undefined : cached.response;
  }
}
