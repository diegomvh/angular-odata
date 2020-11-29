import { ODataRequest, ODataResponse } from '../resources';
import {CacheStorage} from '../types';

export abstract class ODataCacheStorage implements CacheStorage {
  abstract put(req: ODataRequest<any>, response: ODataResponse<any>);
  abstract remove(options: {maxAge: number});
  abstract get(req: ODataRequest<any>, options: {maxAge: number});
}
