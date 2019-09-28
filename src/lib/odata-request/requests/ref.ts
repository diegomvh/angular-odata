import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { Segments } from '../types';
import { ODataClient } from '../../client';

export class ODataRefRequest extends ODataRequest {
  public static readonly $REF = '$ref';

  // Factory
  static factory(service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.ref, ODataRefRequest.$REF);
    options.clear();
    return new ODataRefRequest(service, segments, options);
  }

  post(body: any, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    return super.post(body, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  put(body: any, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    return super.put(body, etag, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  delete(etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    return super.delete(etag, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
