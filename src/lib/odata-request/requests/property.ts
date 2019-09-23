import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { ODataValueRequest } from './value';
import { Segments, ODataSegment, PlainObject } from '../types';
import { ODataService } from '../../odata-service/odata.service';

export class ODataPropertyRequest<P> extends ODataRequest {
  constructor(
    name: string,
    service: ODataService,
    segments?: ODataSegment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.segments.segment(Segments.property, name);
  }

  value() {
    return new ODataValueRequest(this.service,
      this.segments.toObject(),
      this.options.toObject());
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
