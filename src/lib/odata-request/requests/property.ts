import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataValueRequest } from './value';

import { ODataRequest } from '../request';
import { Segments } from '../types';
import { ODataOptions } from '../options';
import { ODataSegments } from '../segments';
import { ODataClient } from '../../client';
import { ODataProperty } from '../../odata-response';

export class ODataPropertyRequest<T> extends ODataRequest<T> {

  // Factory
  static factory<P>(name: string, service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.property, name);
    options.clear();
    return new ODataPropertyRequest<P>(service, segments, options);
  }

  // Segments
  value() {
    return ODataValueRequest.factory<T>(
      this.client, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataProperty<T>> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'property',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
