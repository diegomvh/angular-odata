import { Observable } from 'rxjs';
import { ODataApi } from '../../api';
import { $VALUE } from '../../constants';
import { PathSegmentNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataOptions } from './options';

export class ODataValueResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<V>(
    api: ODataApi,
    type: string | undefined,
    segments: ODataPathSegments,
    query: ODataQueryOptions<V>
  ) {
    const segment = segments.add(PathSegmentNames.value, $VALUE);
    if (type) segment.type(type);
    query.clear();
    return new ODataValueResource<V>(api, { segments, query });
  }

  static fromResource<V>(resource: ODataResource<any>) {
    return ODataValueResource.factory<V>(
      resource.api,
      resource.type(),
      resource.cloneSegments(),
      resource.cloneQuery<V>()
    );
  }

  clone() {
    return new ODataValueResource<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }
  //#endregion

  schema() {
    return undefined;
  }

  //#region Requests
  protected get(options?: ODataOptions): Observable<T> {
    return super.get({ responseType: 'value', ...options });
  }
  //#endregion

  //#region Shortcuts

  /**
   * Fetch the value of the resource.
   * @param options OData options.
   * @returns Observable of the value.
   */
  fetch(options?: ODataOptions): Observable<T> {
    return this.get(options);
  }

  //#endregion
}
