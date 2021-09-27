import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataOptions } from './options';
import { $VALUE } from '../../constants';
import { ODataApi } from '../../api';
import { Http } from '../../utils';
import { PathSegmentNames } from '../../types';

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

  //#region Requests
  get(
    options?: { responseType: 'arraybuffer' } & ODataOptions
  ): Observable<ArrayBuffer>;
  get(options?: { responseType: 'blob' } & ODataOptions): Observable<Blob>;
  get(options: { responseType: any } & ODataOptions): Observable<any> {
    return super.get(options);
  }

  put(
    data: ArrayBuffer | Blob,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<any> {
    return super.put(data, options);
  }
  //#endregion

  //#region Shortcuts
  fetch(
    options?: { responseType: 'arraybuffer' } & ODataOptions
  ): Observable<ArrayBuffer>;
  fetch(options?: { responseType: 'blob' } & ODataOptions): Observable<Blob>;
  fetch(options: { responseType: any } & ODataOptions): Observable<any> {
    return this.get(options);
  }

  fetchArraybuffer(options: ODataOptions = {}): Observable<ArrayBuffer> {
    return this.fetch({ responseType: 'arraybuffer', ...options });
  }

  fetchBlob(options: ODataOptions = {}): Observable<Blob> {
    return this.fetch({ responseType: 'blob', ...options });
  }

  upload(
    data: ArrayBuffer | Blob,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<any> {
    return this.put(data, options);
  }

  uploadArrayBuffer(
    data: ArrayBuffer,
    contentType: string,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<any> {
    options.headers = Http.mergeHttpHeaders(options.headers || {}, {
      'Content-Type': contentType,
    });
    return this.upload(data, options);
  }

  uploadBlob(
    data: Blob,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<any> {
    return this.upload(data, options);
  }
  //#endregion
}
