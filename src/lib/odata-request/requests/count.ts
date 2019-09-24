import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Segments } from '../types';
import { ODataService } from '../../odata-service';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { ODataRequest } from '../request';

export class ODataCountRequest extends ODataRequest {
  public static readonly $COUNT = '$count';

  static factory(service: ODataService, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.count, ODataCountRequest.$COUNT);
    return new ODataCountRequest(service, segments, options);
  }

  get<Number>(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Number> {
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
