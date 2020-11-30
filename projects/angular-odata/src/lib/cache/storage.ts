import { ODataRequest, ODataResponse } from '../resources';
import {CacheStorage} from '../types';

export abstract class ODataCacheStorage implements CacheStorage {
  abstract put(req: ODataRequest<any>, response: ODataResponse<any>): any;
  abstract remove(options: {maxAge: number}): any;
  abstract get(req: ODataRequest<any>, options: {maxAge: number}): any;
}
