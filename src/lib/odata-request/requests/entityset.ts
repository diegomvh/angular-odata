import { ODataCollectionRequest } from './collection';
import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { Observable } from 'rxjs';
import { HttpParams, HttpHeaders } from '@angular/common/http';
import { ODataEntityRequest } from './entity';
import { PlainObject, Segments, ODataSegment } from '../types';
import { ODataService } from '../../odata-service/odata.service';

export class ODataEntitySetRequest<T> extends ODataCollectionRequest<T> {
  constructor(
    name: string,
    service: ODataService,
    segments?: ODataSegment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.segments.segment(Segments.entitySet, name);
  }

  entity(key?: string | number | PlainObject) {
    let entity = this.clone(ODataEntityRequest) as ODataEntityRequest<T>;
    if (key)
      entity.key(key);
    return entity;
  }

  action<T>(name: string) {
    return new ODataActionRequest<T>(name, 
      this.service,
      this.segments.toObject(),
      this.options.toObject());
  }

  function<T>(name: string) {
    return new ODataFunctionRequest<T>(name, 
      this.service,
      this.segments.toObject(),
      this.options.toObject());
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
