import { Observable } from 'rxjs';
import { ODataApi } from '../../api';
import { $VALUE } from '../../constants';
import { PathSegmentNames } from '../../types';
import { Http } from '../../utils';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
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
    options: { responseType: 'arraybuffer' | 'blob' } & ODataOptions
  ): Observable<any> {
    return super.get(options);
  }

  protected override put(
    data: ArrayBuffer | Blob,
    options: ODataOptions = {}
  ): Observable<any> {
    return super.put(data, options);
  }
  //#endregion

  //#region Shortcuts
  fetch(options: { responseType: 'arraybuffer' } & ODataOptions): Observable<ArrayBuffer>;
  fetch(options: { responseType: 'blob' } & ODataOptions): Observable<Blob>;
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
    options: ODataOptions = {}
  ): Observable<any> {
    return this.put(data, options);
  }

  uploadArrayBuffer(
    data: ArrayBuffer,
    contentType: string,
    options: ODataOptions = {}
  ): Observable<any> {
    options.headers = Http.mergeHttpHeaders(options.headers || {}, {
      'Content-Type': contentType,
    });
    return this.upload(data, options);
  }

  uploadBlob(
    data: Blob,
    options: ODataOptions = {}
  ): Observable<any> {
    return this.upload(data, options);
  }
  //#endregion
}
