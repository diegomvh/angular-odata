import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataClient } from '../../client';
import { HttpOptions } from './options';
import { $VALUE } from '../../constants';

export class ODataValueResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<V>(client: ODataClient, type: string | null, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.segment(PathSegmentNames.value, $VALUE);
    if (type)
      segment.setType(type);
    options.clear();
    return new ODataValueResource<V>(client, segments, options);
  }

  clone() {
    return new ODataValueResource<T>(this._client, this.pathSegments.clone(), this.queryOptions.clone());
  }
  //#endregion

  //#region Requests
  arraybuffer(options?: HttpOptions): Observable<ArrayBuffer> {
    return super.get(
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{ responseType: 'arraybuffer' }, options || {})
    );
  }

  blob(options?: HttpOptions): Observable<Blob> {
    return super.get(
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{ responseType: 'blob' }, options || {})
    );
  }

  get(options?: HttpOptions): Observable<T> {
    return super.get(
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{ responseType: 'value' }, options || {})
    );
  }
  //#endregion
}
