import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { Segments } from '../types';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { ODataMetadata } from '../../odata-response';
import { map } from 'rxjs/operators';
import { ODataClient } from '../../client';
import { $METADATA } from '../../constants';

export class ODataMetadataRequest extends ODataRequest<any> {

  static factory(service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.metadata, $METADATA);
    options.clear();
    return new ODataMetadataRequest(service, segments, options);
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
