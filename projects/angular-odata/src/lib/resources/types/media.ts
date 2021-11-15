import { $VALUE } from '../../constants';
import { Http } from '../../utils';
import { ODataApi } from '../../api';
import { ODataOptions } from './options';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { Observable } from 'rxjs';
import { PathSegmentNames } from '../../types';

export class ODataMediaResource extends ODataResource<any> {
  //#region Factory
  static factory<V>(
    api: ODataApi,
    segments: ODataPathSegments,
    options: ODataQueryOptions<V>
  ) {
    segments.add(PathSegmentNames.value, $VALUE);
    return new ODataMediaResource(api, segments, options);
  }

  clone() {
    return new ODataMediaResource(
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
  protected get(
    options: { responseType: any } & ODataOptions
  ): Observable<any> {
    return super.get(options);
  }

  protected put(
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
