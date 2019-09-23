import { ODataRequestBase } from './odata-request';
import { ODataService } from '../odata-service/odata.service';
import { Segment, PlainObject } from './odata-request-handlers';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export class ODataRefUrl extends ODataRequestBase {
  public static readonly REF = 'ref';
  public static readonly $REF = '$ref';

  constructor(
    service: ODataService,
    segments?: Segment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.wrapSegment(ODataRefUrl.REF, ODataRefUrl.$REF);
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
      responseType: 'json',
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
      responseType: 'json',
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
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
