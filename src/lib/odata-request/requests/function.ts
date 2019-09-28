import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { ODataEntitySet } from '../../odata-response/entityset';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { Segments, Options, PlainObject } from '../types';
import { ODataClient } from '../../client';

export class ODataFunctionRequest<T> extends ODataRequest {

  // Factory
  static factory<T>(name: string, service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.functionCall, name);
    options.keep(Options.format);
    return new ODataFunctionRequest<T>(service, segments, options);
  }

  // Parameters
  parameters(opts?: PlainObject) {
    return this.segments.last().option(Options.parameters, opts);
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<ODataEntitySet<T>>;

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
    responseType?: 'text'|'entity'|'entityset'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any>;

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'text'|'entity'|'entityset'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {
    return super.get({
      headers: options.headers,
      observe: 'body',
      params: options.params,
      responseType: options.responseType,
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials,
      withCount: options.withCount
    });
  }
}