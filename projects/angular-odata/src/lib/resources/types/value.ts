import { $VALUE } from '../../constants';
import { ODataApi } from '../../api';
import { ODataOptions } from './options';
import { ODataPathSegments } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataResource } from '../resource';
import { Observable } from 'rxjs';
import { PathSegmentNames } from '../../types';

export class ODataValueResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<V>(
    api: ODataApi,
    type: string | undefined,
    segments: ODataPathSegments,
    options: ODataQueryOptions
  ) {
    const segment = segments.add(PathSegmentNames.value, $VALUE);
    if (type) segment.type(type);
    options.clear();
    return new ODataValueResource<V>(api, segments, options);
  }
  //#endregion

  clone() {
    return new ODataValueResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  schema() {
    return undefined;
  }

  //#region Requests
  protected get(options?: ODataOptions): Observable<T> {
    return super.get({ responseType: 'value', ...options });
  }
  //#endregion

  //#region Shortcuts
  fetch(options?: ODataOptions): Observable<T> {
    return this.get(options);
  }
  //#endregion
}
