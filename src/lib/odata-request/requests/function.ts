import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { ODataSet } from '../../odata-response/odata-set';
import { Segments, ODataSegment, PlainObject } from '../types';
import { ODataService } from '../../odata-service/odata.service';

export class ODataFunctionRequest<T> extends ODataRequest {
  constructor(
    name: string,
    service: ODataService,
    segments?: ODataSegment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.segments.segment(Segments.functionCall, name);
  }

  parameters() {
    return this.segments.last().options();
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'json',
    withCredentials?: boolean,
  }): Observable<T>;

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'set',
    withCredentials?: boolean,
  }): Observable<ODataSet<T>>;

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<T>;

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<any> {
    return super.get({
      headers: options.headers,
      observe: 'body',
      params: options.params,
      responseType: options.responseType,
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
  }
}