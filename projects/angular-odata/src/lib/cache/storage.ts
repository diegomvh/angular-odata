import { ODataRequest, ODataResponse } from '../resources';
import {CacheStorage} from '../types';

export abstract class ODataCacheStorage implements CacheStorage {
  maxAge: number;
  constructor(maxAge: number) {
    this.maxAge = maxAge;
  }
  abstract put(req: ODataRequest<any>, response: ODataResponse<any>);
  abstract get(req: ODataRequest<any>);
}
