import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { ODataValueRequest } from './value';
import { Segments } from '../types';

export class ODataPropertyRequest<P> extends ODataRequest {
  value() {
    let segments = this.segments.clone();
    segments.segment(Segments.value, ODataValueRequest.$VALUE);
    return new ODataValueRequest<P>(this.service, segments);
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<P> {
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
