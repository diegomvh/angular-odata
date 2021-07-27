import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { HttpOptions } from './options';
import { $VALUE } from '../../constants';
import { ODataApi } from '../../api';
import { Http } from '../../utils';

export class ODataMediaResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<V>(
    api: ODataApi,
    segments: ODataPathSegments,
    options: ODataQueryOptions
  ) {
    const segment = segments.add(PathSegmentNames.value, $VALUE);
    return new ODataMediaResource<V>(api, segments, options);
  }
  //#endregion

  clone() {
    return new ODataMediaResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  schema() {
    return undefined;
  }

  //#region Shortcuts
  fetch(
    options?: { responseType: 'arraybuffer' } & HttpOptions
  ): Observable<ArrayBuffer>;
  fetch(options?: { responseType: 'blob' } & HttpOptions): Observable<Blob>;
  fetch(options: { responseType: any } & HttpOptions): Observable<any> {
    return super.get(options);
  }
  fetchArraybuffer(options: HttpOptions = {}): Observable<ArrayBuffer> {
    return this.fetch({ responseType: 'arraybuffer', ...options });
  }

  fetchBlob(options: HttpOptions = {}): Observable<Blob> {
    return this.fetch({ responseType: 'blob', ...options });
  }

  upload(
    data: ArrayBuffer | Blob,
    options: HttpOptions & { etag?: string } = {}
  ): Observable<any> {
    return super.put(data, options);
  }

  uploadArrayBuffer(
    data: ArrayBuffer,
    contentType: string,
    options: HttpOptions & { etag?: string } = {}
  ): Observable<any> {
    options.headers = Http.mergeHttpHeaders(options.headers || {}, {
      'Content-Type': contentType,
    });
    return this.upload(data, options);
  }

  uploadBlob(
    data: Blob,
    options: HttpOptions & { etag?: string } = {}
  ): Observable<any> {
    return this.upload(data, options);
  }
  //#endregion
}
