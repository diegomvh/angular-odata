import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { HttpOptions } from './options';
import { $VALUE } from '../../constants';
import { ODataApi } from '../../api';

export class ODataValueResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<V>(api: ODataApi, type: string | null, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.segment(PathSegmentNames.value, $VALUE);
    if (type)
      segment.setType(type);
    options.clear();
    return new ODataValueResource<V>(api, segments, options);
  }

  clone() {
    return new ODataValueResource<T>(this.api, this.pathSegments.clone(), this.queryOptions.clone());
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
