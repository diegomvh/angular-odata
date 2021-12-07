import { Observable } from 'rxjs';
import { ODataApi } from '../../api';
import { $COUNT } from '../../constants';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataOptions } from './options';

export class ODataCountResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<T>(
    api: ODataApi,
    segments: ODataPathSegments,
    query: ODataQueryOptions<T>
  ) {
    segments.add(PathSegmentNames.count, $COUNT).type('Edm.Int32');
    query.keep(QueryOptionNames.filter, QueryOptionNames.search);
    return new ODataCountResource<T>(api, { segments, query });
  }

  static fromResource<T>(resource: ODataResource<any>) {
    return ODataCountResource.factory<T>(
      resource.api,
      resource.cloneSegments(),
      resource.cloneQuery<T>()
    );
  }

  clone() {
    return new ODataCountResource<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }
  //#endregion

  schema() {
    return undefined;
  }

  //#region Requests
  protected get(options?: ODataOptions): Observable<number> {
    return super.get({ responseType: 'value', ...options });
  }
  //#endregion

  //#region Shortcuts
  /**
   * Fetch the count of the set.
   * @param options Options for the request
   * @returns The count of the set
   */
  fetch(options?: ODataOptions): Observable<number> {
    return this.get(options);
  }
  //#endregion
}
