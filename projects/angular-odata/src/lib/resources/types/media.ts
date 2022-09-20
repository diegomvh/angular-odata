import { HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ODataApi } from '../../api';
import { $VALUE } from '../../constants';
import { PathSegmentNames } from '../../types';
import { Http } from '../../utils';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataResponse } from '../responses';
import { ODataOptions } from './options';

export class ODataMediaResource extends ODataResource<any> {
  //#region Factory
  static factory<V>(
    api: ODataApi,
    {
      segments,
      query,
    }: {
      segments: ODataPathSegments;
      query?: ODataQueryOptions<V>;
    }
  ) {
    segments.add(PathSegmentNames.value, $VALUE);
    return new ODataMediaResource(api, { segments, query });
  }

  override clone(): ODataMediaResource {
    return super.clone() as ODataMediaResource;
  }
  //#endregion

  //#region Requests
  protected override get(
    options: { responseType: 'arraybuffer' | 'blob', observe?: 'body' | 'events' | 'response'; } & ODataOptions
  ): Observable<any> {
    return super.get(options);
  }

  protected override put(
    data: ArrayBuffer | Blob,
    options: ODataOptions & { etag?: string; observe?: 'body' | 'events' | 'response'; } = {}
  ): Observable<any> {
    return super.put(data, options);
  }
  //#endregion

  //#region Shortcuts
  fetch(options: { responseType: 'arraybuffer' } & ODataOptions): Observable<ArrayBuffer>;
  fetch(options: { responseType: 'arraybuffer', observe: 'response' } & ODataOptions): Observable<ODataResponse<ArrayBuffer>>;
  fetch(options: { responseType: 'arraybuffer', observe: 'events' } & ODataOptions): Observable<HttpEvent<ArrayBuffer>>;
  fetch(options: { responseType: 'blob' } & ODataOptions): Observable<Blob>;
  fetch(options: { responseType: 'blob', observe: 'response' } & ODataOptions): Observable<ODataResponse<Blob>>;
  fetch(options: { responseType: 'blob', observe: 'events' } & ODataOptions): Observable<HttpEvent<Blob>>;
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
