import { ODataRequest } from '../request';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ODataService } from '../../odata-service';
import { ODataSegment, PlainObject, Segments } from '../types';

export class ODataCountRequest extends ODataRequest {
  public static readonly $COUNT = '$count';

  constructor(
    service: ODataService,
    segments?: ODataSegment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.segments.segment(Segments.count, ODataCountRequest.$COUNT);
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
