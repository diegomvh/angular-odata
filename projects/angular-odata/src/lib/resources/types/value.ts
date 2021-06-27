import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { HttpOptions } from './options';
import { $VALUE } from '../../constants';
import { ODataApi } from '../../api';

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

  //#region Shortcuts
  fetch(options?: { responseType: 'value' } & HttpOptions): Observable<T>;
  fetch(
    options?: { responseType: 'arraybuffer' } & HttpOptions
  ): Observable<ArrayBuffer>;
  fetch(options?: { responseType: 'blob' } & HttpOptions): Observable<Blob>;
  fetch(options: { responseType: any } & HttpOptions): Observable<any> {
    return super.get(options);
  }

  fetchValue(options: HttpOptions = {}): Observable<T> {
    return this.fetch({ responseType: 'value', ...options });
  }

  fetchArraybuffer(options: HttpOptions = {}): Observable<ArrayBuffer> {
    return this.fetch({ responseType: 'arraybuffer', ...options });
  }

  fetchBlob(options: HttpOptions = {}): Observable<Blob> {
    return this.fetch({ responseType: 'blob', ...options });
  }
  //#endregion
}
