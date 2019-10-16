import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Segments, Options } from '../types';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { ODataRequest } from '../request';
import { ODataClient } from '../../client';
import { $COUNT } from '../../constants';

export class ODataCountRequest extends ODataRequest {
  // Factory
  static factory(service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.count, $COUNT);
    options.keep(Options.filter, Options.search);
    return new ODataCountRequest(service, segments, options);
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
