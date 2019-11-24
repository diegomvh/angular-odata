import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataSegments, Segments } from '../segments';
import { ODataOptions } from '../options';
import { ODataClient } from '../../client';
import { ODataResource } from '../resource';
import { Parser } from '../../models';
import { ODataValue, ODataCollection, ODataSingle } from '../responses';
import { map } from 'rxjs/operators';
import { $COUNT } from '../../types';

export class ODataActionResource<T> extends ODataResource<T> {
  // Factory
  static factory<R>(name: string, client: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      parser?: Parser<R>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || null;

    segments.segment(Segments.actionCall, name);
    options.clear();
    return new ODataActionResource<R>(client, segments, options, parser);
  }

  post(body: any | null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'entity',
    withCredentials?: boolean,
  }): Observable<ODataSingle<T>>;

  post(body?: any | null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entityset',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<ODataCollection<T>>;

  post(body?: any | null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'property',
    withCredentials?: boolean,
  }): Observable<ODataValue<T>>;

  post(body?: any | null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'entity'|'entityset'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {

    let params = options && options.params;
    if (options && options.withCount)
      params = this.client.mergeHttpParams(params, {[$COUNT]: 'true'})

    let res$ = this.client.post(this, body, {
      headers: options && options.headers,
      observe: 'body',
      params: params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
    if (options && options.responseType) {
      switch (options.responseType) {
        case 'entity':
          return res$.pipe(map((body: any) => this.toSingle(body)));
        case 'entityset':
          return res$.pipe(map((body: any) => this.toCollection(body)));
        case 'property':
          return res$.pipe(map((body: any) => this.toValue(body)));
      }
    }
    return res$;
  }
}
