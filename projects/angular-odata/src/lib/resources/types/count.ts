import { HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ODataApi } from '../../api';
import { $COUNT } from '../../constants';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataResponse } from '../responses';
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
    segments.add(PathSegmentNames.count, $COUNT).type('Edm.Int32');
    query?.keep(QueryOptionNames.filter, QueryOptionNames.search);
    return new ODataCountResource<T>(api, { segments, query });
  }
  override clone(): ODataCountResource<T> {
    return super.clone() as ODataCountResource<T>;
  }
  //#endregion

  //#region Requests
  protected override get(
    options?: ODataOptions & { observe?: 'body' | 'events' | 'response' }
    ): Observable<any> {
    return super.get({ responseType: 'value', ...options });
  }
  //#endregion

  //#region Shortcuts
  /**
   * Fetch the count of the set.
   * @param options Options for the request
   * @returns The count of the set
   */
  fetch(
    options: ODataOptions & { observe: 'events' }
  ): Observable<HttpEvent<number>>;
  fetch(
    options: ODataOptions & { observe: 'response' }
  ): Observable<ODataResponse<number>>;
  fetch(
    options?: ODataOptions 
  ): Observable<number>;
  fetch(options?: ODataOptions & {observe?: any}): Observable<any> {
    return this.get(options);
  }
  //#endregion
}
