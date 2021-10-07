import { $ID, $REF, ODATA_ID } from '../../constants';

import { ODataApi } from '../../api';
import { ODataEntityResource } from './entity';
import { ODataOptions } from './options';
import { ODataPathSegments } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataResource } from '../resource';
import { Observable } from 'rxjs';
import { PathSegmentNames } from '../../types';

export class ODataReferenceResource extends ODataResource<any> {
  //#region Factory
  static factory<P>(
    api: ODataApi,
    segments: ODataPathSegments,
    options: ODataQueryOptions
  ) {
    segments.add(PathSegmentNames.reference, $REF);
    options.clear();
    return new ODataReferenceResource(api, segments, options);
  }
  //#endregion

  clone() {
    return new ODataReferenceResource(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  schema() {
    return undefined;
  }

  //#region Requests
  protected post(
    target: ODataEntityResource<any>,
    options?: ODataOptions
  ): Observable<any> {
    return super.post({ [ODATA_ID]: target.endpointUrl(false) }, options);
  }

  protected put(
    target: ODataEntityResource<any>,
    options?: ODataOptions & { etag?: string }
  ): Observable<any> {
    return super.post({ [ODATA_ID]: target.endpointUrl(false) }, options);
  }

  protected delete({
    etag,
    target,
    ...options
  }: {
    etag?: string;
    target?: ODataEntityResource<any>;
  } & ODataOptions = {}): Observable<any> {
    if (target) {
      options.params = { [$ID]: target.endpointUrl(false) };
    }
    return super.delete({ etag, ...options });
  }
  //#endregion

  //#region Shortcuts for collections
  add(
    target: ODataEntityResource<any>,
    options?: ODataOptions
  ): Observable<any> {
    return this.post(target, options);
  }

  remove(
    target?: ODataEntityResource<any>,
    options?: ODataOptions
  ): Observable<any> {
    return this.delete({ target, ...options });
  }
  //#region

  //#region Shortcuts for single
  set(
    target: ODataEntityResource<any>,
    options?: ODataOptions & { etag?: string }
  ): Observable<any> {
    return this.put(target, options);
  }

  unset(options?: ODataOptions & { etag?: string }): Observable<any> {
    return this.delete(options);
  }
  //#region
}
