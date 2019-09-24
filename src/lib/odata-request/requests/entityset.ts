import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PlainObject, Segments } from '../types';
import { ODataService } from '../../odata-service/service';
import { ODataSegments } from '../segments';

import { ODataCollectionRequest } from './collection';
import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { ODataEntityRequest } from './entity';
import { ODataOptions } from '../options';

export class ODataEntitySetRequest<T> extends ODataCollectionRequest<T> {

  static factory<T>(name: string, service: ODataService, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.entitySet, name);
    return new ODataEntitySetRequest<T>(service, segments, options);
  }

  entity(key?: string | number | PlainObject) {
    let entity = ODataEntityRequest.factory<T>(this.service, this.segments.clone());
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
