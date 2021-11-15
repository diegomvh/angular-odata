import { PathSegmentNames, QueryOptionNames } from '../../types';

import { $COUNT } from '../../constants';
import { ODataApi } from '../../api';
import { ODataOptions } from './options';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { Observable } from 'rxjs';

export class ODataCountResource extends ODataResource<any> {
  //#region Factory
  static factory<T>(
    api: ODataApi,
    segments: ODataPathSegments,
    query: ODataQueryOptions<T>
  ) {
    segments.add(PathSegmentNames.count, $COUNT).type('Edm.Int32');
    query.keep(QueryOptionNames.filter, QueryOptionNames.search);
    return new ODataCountResource(api, segments, query);
  }

  clone() {
    return new ODataCountResource(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
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
