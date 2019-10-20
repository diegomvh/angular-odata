import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataEntitySet } from '../../odata-response/entityset';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { Segments } from '../types';
import { ODataClient } from '../../client';
import { ODataProperty } from '../../odata-response';
import { ODataRequest } from './request';
import { Schema } from '../schema';

export class ODataActionRequest<T> extends ODataRequest<T> {
  // Factory
  static factory<R>(name: string, client: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      schema?: Schema<R>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let schema = opts && opts.schema || new Schema<R>();

    segments.segment(Segments.actionCall, name);
    options.clear();
    return new ODataActionRequest<R>(client, segments, options, schema);
  }

  post(body: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  post(body: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'entityset',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<ODataEntitySet<T>>;

  post(body: T, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'property',
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>>;

  post(body: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'entity'|'entityset'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {
    return super.post(body, {
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
