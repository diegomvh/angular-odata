import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataSegments, Segments } from '../segments';
import { ODataOptions } from '../options';
import { map } from 'rxjs/operators';
import { ODataClient } from '../../client';
import { $METADATA } from '../../types';
import { Schema, Parser } from '../../schema';
import { ODataMetadata } from '../responses';

export class ODataMetadataResource extends ODataResource<any> {

  static factory(service: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      parser?: Parser<any>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || new Schema<any>();

    segments.segment(Segments.metadata, $METADATA);
    options.clear();
    return new ODataMetadataResource(service, segments, options, parser);
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataMetadata> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'text',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => new ODataMetadata(body)));
  }
}
