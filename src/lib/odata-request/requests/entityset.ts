import { ODataCollectionRequest } from './collection';
import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { Observable } from 'rxjs';
import { HttpParams, HttpHeaders } from '@angular/common/http';
import { ODataEntityRequest } from './entity';
import { PlainObject, Segments, ODataSegment } from '../types';
import { ODataService } from '../../odata-service/odata.service';
import { ODataSegments } from '../segments';

export class ODataEntitySetRequest<T> extends ODataCollectionRequest<T> {

  static factory<T>(service: ODataService, name: string) {
    let segments = new ODataSegments();
    segments.segment(Segments.entitySet, name);
    return new ODataEntitySetRequest<T>(service, segments);
  }

  entity(key?: string | number | PlainObject) {
    let entity = this.clone(ODataEntityRequest) as ODataEntityRequest<T>;
    if (key)
      entity.key(key);
    return entity;
  }

  action<T>(name: string) {
    let segments = this.segments.clone();
    segments.segment(Segments.actionCall, name);
    return new ODataActionRequest<T>(this.service, segments);
  }

  function<T>(name: string) {
    let segments = this.segments.clone();
    segments.segment(Segments.functionCall, name);
    return new ODataFunctionRequest<T>(this.service, segments);
  }

  post(body: T, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.post(body, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
