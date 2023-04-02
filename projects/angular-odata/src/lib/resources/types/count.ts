import { Observable } from 'rxjs';
import { ODataApi } from '../../api';
import { $COUNT } from '../../constants';
import { PathSegment, QueryOption } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataOptions } from './options';

export class ODataCountResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<T>(
    api: ODataApi,
    {
      segments,
      query,
    }: {
      segments: ODataPathSegments;
      query?: ODataQueryOptions<T>;
    }
  ) {
    segments.add(PathSegment.count, $COUNT).type('Edm.Int32');
    query?.keep(QueryOption.filter, QueryOption.search);
    return new ODataCountResource<T>(api, { segments, query });
  }
  override clone(): ODataCountResource<T> {
    return super.clone() as ODataCountResource<T>;
  }
  //#endregion

  //#region Requests
  protected override get(options?: ODataOptions): Observable<any> {
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
