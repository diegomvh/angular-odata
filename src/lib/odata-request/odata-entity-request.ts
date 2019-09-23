import { Utils } from '../utils/utils';
import { PlainObject } from './odata-request-handlers';
import { ODataSingleUrl } from './odata-single-request';
import { ODataNavigationPropertyUrl } from './odata-navigationproperty-request';
import { ODataActionUrl } from './odata-action-request';
import { ODataFunctionUrl } from './odata-function-request';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export class ODataEntityUrl<T> extends ODataSingleUrl<T> {
  // Entity key
  key(opts?: string | number | PlainObject) {
    let segment = this.lastSegment();
    if (Utils.isUndefined(opts)) return segment.options().get("key");
    this.removeFilter();
    this.removeOrderBy();
    this.removeCount();
    this.removeSkip();
    this.removeTop();
    segment.options().set("key", opts);
  }

  navigationProperty<E>(name: string) {
    let query = this.clone(ODataNavigationPropertyUrl) as ODataNavigationPropertyUrl<E>;
    query.name(name);
    return query;
  }

  action<T>(name: string) {
    let action = this.clone(ODataActionUrl) as ODataActionUrl<T>;
    action.name(name);
    return action;
  }

  function<T>(name: string) {
    let func = this.clone(ODataFunctionUrl) as ODataFunctionUrl<T>;
    func.name(name);
    return func;
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

  put(body: T, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.put(body, etag, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  patch(body: Partial<T>, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.patch(body, etag, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  delete(etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.delete(etag, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
