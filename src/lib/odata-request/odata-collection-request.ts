import { ODataRequestBase } from './odata-request';
import { ODataEntityUrl } from './odata-entity-request';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { ODataSet } from '../odata-response/odata-set';
import { Observable } from 'rxjs';
import { ODataCountUrl } from './odata-count-request';
import { PlainObject } from './odata-request-handlers';

export class ODataCollectionUrl<T> extends ODataRequestBase {
  // Entity key
  entity(key?: string | number | PlainObject) {
    let entity = this.clone(ODataEntityUrl) as ODataEntityUrl<T>;
    if (key)
      entity.key(key);
    return entity;
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<T>> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'set',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  getCount(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Number> {
    return (this.clone(ODataCountUrl) as ODataCountUrl).get<Number>(options);
  }
}
