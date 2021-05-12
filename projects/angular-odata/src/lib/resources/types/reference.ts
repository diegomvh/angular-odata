import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataEntityResource } from './entity';
import { HttpOptions } from './options';
import { $REF, $ID, ODATA_ID } from '../../constants';
import { ODataApi } from '../../api';

export class ODataReferenceResource extends ODataResource<any> {
  //#region Factory
  static factory<P>(api: ODataApi, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.add(PathSegmentNames.reference, $REF);
    options.clear();
    return new ODataReferenceResource(api, segments, options);
  }

  clone() {
    return new ODataReferenceResource(this.api, this.cloneSegments(), this.cloneQuery());
  }
  //#endregion

  //#region Requests
  post(target: ODataEntityResource<any>, options?: HttpOptions): Observable<any> {
    return super.post({[ODATA_ID]: target.endpointUrl(false)}, options);
  }

  put(target: ODataEntityResource<any>, options?: HttpOptions & { etag?: string }): Observable<any> {
    return super.post({[ODATA_ID]: target.endpointUrl(false)}, options);
  }

  delete({etag, target, ...options}: { etag?: string, target?: ODataEntityResource<any>} & HttpOptions = {}): Observable<any> {
    if (target) {
      options.params = {[$ID]: target.endpointUrl(false)};
    }
    return super.delete({etag, ...options});
  }
  //#endregion

  //#region Custom for collections
  add(target: ODataEntityResource<any>, options?: HttpOptions): Observable<any> {
    return this.post(target, options);
  }

  remove(target?: ODataEntityResource<any>, options?: HttpOptions): Observable<any> {
    return this.delete({target, ...options});
  }
  //#region

  //#region Custom for single
  set(target: ODataEntityResource<any>, options?: HttpOptions & { etag?: string }): Observable<any>  {
    return this.put(target, options);
  }

  unset(options?: HttpOptions & { etag?: string }): Observable<any>  {
    return this.delete(options);
  }
  //#region
}
