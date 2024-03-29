import { Observable } from 'rxjs';
import { ODataApi } from '../../api';
import { $COUNT } from '../../constants';
import { EdmType, PathSegment, QueryOption } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataOptions } from './options';
import { ODataStructuredType } from '../../schema';

export class ODataCountResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<T>(
    api: ODataApi,
    {
      schema,
      segments,
      query,
    }: {
      schema?: ODataStructuredType<T>;
      segments: ODataPathSegments;
      query?: ODataQueryOptions<T>;
    },
  ) {
    segments.add(PathSegment.count, $COUNT).type('Edm.Int32');
    query?.keep(QueryOption.filter, QueryOption.search);
    return new ODataCountResource<T>(api, { schema, segments, query });
  }
  override clone(): ODataCountResource<T> {
    return super.clone() as ODataCountResource<T>;
  }
  //#endregion

  //#region Requests
  protected override get(options?: ODataOptions): Observable<any> {
    return super.get({ responseType: 'value', ...options });
  }

  override returnType() {
    return EdmType.Int32;
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
