import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, SegmentTypes } from '../segments';
import { ODataQueryOptions } from '../options';
import { ODataClient } from '../../client';
import { $VALUE } from '../../types';
import { Parser } from '../../models';

export class ODataMediaResource<T> extends ODataResource<T> {
  // Factory
  static factory<V>(service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parser?: Parser<V>}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.value, $VALUE);
    options.clear();
    return new ODataMediaResource<V>(service, segments, options, parser);
  }

  arraybuffer(options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ArrayBuffer> {
    return this.client.get(this, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'arraybuffer',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  blob(options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: 'body',
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Blob> {
    return this.client.get(this, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'blob',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
