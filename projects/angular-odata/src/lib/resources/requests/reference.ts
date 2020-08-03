import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataClient } from '../../client';
import { ODataEntityResource } from './entity';
import { $REF as $REFERENCE, ODATA_ID, $ID } from '../../types';
import { HttpOptions } from './options';
import { PlainObject } from '../builder';

export class ODataReferenceResource extends ODataResource<any> {
  //#region Factory
  static factory<P>(client: ODataClient, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.reference, $REFERENCE);
    options.clear();
    return new ODataReferenceResource(client, segments, options);
  }

  clone() {
    return super.clone<ODataReferenceResource>();
  }
  //#endregion

  //#region Inmutable Resource
  custom(opts: PlainObject) {
    let options = this.queryOptions.clone();
    options.option<PlainObject>(QueryOptionNames.custom, opts);
    return new ODataReferenceResource(this.client, this.pathSegments.clone(), options);
  }
  //#endregion

  //#region Mutable Resource
  get query() {
    const options = this.queryOptions;
    return {
      custom(opts?: PlainObject) {
        return options.option<PlainObject>(QueryOptionNames.custom, opts);
      }
    }
  }
  //#endregion

  //#region Requests
  post(target: ODataEntityResource<any>, options?: HttpOptions): Observable<any> {
    let related = this.client.endpointUrl(target);
    return this.client.post(this, {[ODATA_ID]: related},
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'json'}, options || {})
    );
  }

  put(target: ODataEntityResource<any>, options?: HttpOptions & { etag?: string }): Observable<any> {
    let related = this.client.endpointUrl(target);
    return this.client.put(this, {[ODATA_ID]: related},
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'json'}, options || {})
    );
  }

  delete(options?: HttpOptions & { etag?: string, target?: ODataEntityResource<any> }): Observable<any> {
    if (options && options.target) {
      let related = this.client.endpointUrl(options.target);
      this.query.custom({[$ID]: related});
    }
    return this.client.delete(this,
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'json'}, options || {})
    );
  }
  //#endregion

  //#region Custom for collections
  add(target: ODataEntityResource<any>, options?: HttpOptions): Observable<any> {
    return this.post(target, options);
  }

  remove(target?: ODataEntityResource<any>, options?: HttpOptions): Observable<any> {
    return this.delete(Object.assign({target}, options));
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
