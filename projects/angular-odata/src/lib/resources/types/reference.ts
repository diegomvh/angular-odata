import { $ID, $REF, ODATA_ID } from '../../constants';

import { ODataApi } from '../../api';
import { ODataEntityResource } from './entity';
import { ODataOptions } from './options';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { Observable } from 'rxjs';
import { PathSegmentNames } from '../../types';

export class ODataReferenceResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<P>(
    api: ODataApi,
    segments: ODataPathSegments,
    options: ODataQueryOptions<P>
  ) {
    segments.add(PathSegmentNames.reference, $REF);
    options.clear();
    return new ODataReferenceResource<P>(api, segments, options);
  }

  clone() {
    return new ODataReferenceResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery<T>()
    );
  }
  //#endregion

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
    return super.put({ [ODATA_ID]: target.endpointUrl(false) }, options);
  }

  //TODO: https://github.com/OData/AspNetCoreOData/blob/08b00758dac691b28aa675f5aa3522fc1caa089e/sample/ODataRoutingSample/Controllers/v1/OrganizationsController.cs#L178
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
  /**
   * Add the given target to the collection.
   * @param target The target resource
   * @param options Options for the request
   * @returns Observable of the response
   */
  add(
    target: ODataEntityResource<any>,
    options?: ODataOptions
  ): Observable<any> {
    return this.post(target, options);
  }

  /**
   * Remove the given target from the collection.
   * @param target The target resource
   * @param options Options for the request
   * @returns Observable of the response
   */
  remove(
    target?: ODataEntityResource<any>,
    options?: ODataOptions
  ): Observable<any> {
    return this.delete({ target, ...options });
  }
  //#region

  //#region Shortcuts for single
  /**
   * Set the reference to the given target.
   * @param target The target resource
   * @param options Options for the request
   * @returns Observable of the response
   */
  set(
    target: ODataEntityResource<any>,
    options?: ODataOptions & { etag?: string }
  ): Observable<any> {
    return this.put(target, options);
  }

  /**
   * Unset the reference to the given target.
   * @param options Options for the request.
   * @returns Observable of the response
   */
  unset(options?: ODataOptions & { etag?: string }): Observable<any> {
    return this.delete(options);
  }
  //#region
}
