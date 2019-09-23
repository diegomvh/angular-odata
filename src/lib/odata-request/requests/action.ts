import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest, ODataObserve } from '../request';
import { ODataSet } from '../../odata-response/odata-set';
import { ODataService } from '../../odata-service/odata.service';
import { ODataSegment, PlainObject, Segments } from '../types';

export class ODataActionRequest<T> extends ODataRequest {
  constructor(
    name: string,
    service: ODataService,
    segments?: ODataSegment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.segments.segment(Segments.actionCall, name);
  }

  post(body: T, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  post(body: T, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'set',
    withCredentials?: boolean,
  }): Observable<ODataSet<T>>;

  post(body: T, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe: 'body',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<any>;

  post(body: T, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    return super.post(body, {
      headers: options.headers,
      observe: options.observe,
      params: options.params,
      responseType: options.responseType,
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
  }
}
