import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataSegments, Segments } from '../segments';
import { ODataOptions, Options } from '../options';
import { ODataResource } from '../resource';
import { ODataClient } from '../../client';
import { $COUNT } from '../../types';
import { Schema, Parser } from '../../schema';

export class ODataCountResource extends ODataResource<number> {
  // Factory
  static factory(service: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      parser?: Parser<any>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || new Schema<any>();

    segments.segment(Segments.count, $COUNT);
    options.keep(Options.filter, Options.search);
    return new ODataCountResource(service, segments, options, parser);
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<number> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
