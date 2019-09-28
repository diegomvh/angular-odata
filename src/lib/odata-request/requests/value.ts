import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { Segments } from '../types';
import { ODataClient } from '../../client';

export class ODataValueRequest<V> extends ODataRequest {
  public static readonly $VALUE = '$value';

  // Factory
  static factory<T>(service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.value, ODataValueRequest.$VALUE);
    options.clear();
    return new ODataValueRequest<T>(service, segments, options);
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<V> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

}
