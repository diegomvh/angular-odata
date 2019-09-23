import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataSingleRequest } from './single';
import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { Utils } from '../../utils/utils';
import { PlainObject } from '../types';
import { ODataNavigationPropertyRequest } from './navigationproperty';
import { ODataPropertyRequest } from './property';

export class ODataEntityRequest<T> extends ODataSingleRequest<T> {
  // Entity key
  key(key?: string | number | PlainObject) {
    let segment = this.segments.last();
    if (Utils.isUndefined(key)) return segment.options().get("key");
    segment.options().set("key", key);
  }

  navigationProperty<E>(name: string) {
    return new ODataNavigationPropertyRequest<E>(name, 
      this.service, 
      this.segments.toObject(), 
      this.options.toObject());
  }

  property<P>(name: string) {
    return new ODataPropertyRequest<P>(name, 
      this.service, 
      this.segments.toObject(), 
      this.options.toObject());
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
