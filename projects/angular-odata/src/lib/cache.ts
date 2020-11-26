import { Injectable } from '@angular/core';
import { ODataRequest, ODataResponse } from './resources';
import { ODataSettings } from './settings';

export interface RequestCacheEntry {
  url: string;
  response: ODataResponse<any>;
  lastRead: number;
}

const CACHE_KEY = "ODATA_CACHE";
const maxAge = 30000;

@Injectable()
export class ODataCache {
  responses = new Map<string, RequestCacheEntry>();

  constructor(
    protected settings: ODataSettings
  ) { }

  isCacheable(req: ODataRequest<any>) {
    return req.method === 'GET';
  }

  put(req: ODataRequest<any>, response: ODataResponse<any>) {
    const url = req.urlWithParams;

    const newEntry = { url, response, lastRead: Date.now() };
    this.responses.set(url, newEntry);

    // remove expired cache entries
    const expired = Date.now() - maxAge;
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

    const isExpired = cached.lastRead < (Date.now() - maxAge);
    return isExpired ? undefined : cached.response;
  }
}
