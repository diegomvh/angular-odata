import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataSingleRequest } from './single';
import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { Utils } from '../../utils/utils';
import { PlainObject, Segments } from '../types';
import { ODataNavigationPropertyRequest } from './navigationproperty';
import { ODataPropertyRequest } from './property';

export class ODataEntityRequest<T> extends ODataSingleRequest<T> {
  // Entity key
  key(key?: string | number | PlainObject) {
    let segment = this.segments.last();
    if (Utils.isUndefined(key)) return segment.options().get("key");
    segment.options().set("key", key);
  }

  navigationProperty<N>(name: string) {
    let segments = this.segments.clone();
    segments.segment(Segments.navigationProperty, name);
    return new ODataNavigationPropertyRequest<N>(this.service, segments);
  }

  property<P>(name: string) {
    let segments = this.segments.clone();
    segments.segment(Segments.property, name);
    return new ODataPropertyRequest<P>(this.service, segments);
  }

  action<A>(name: string) {
    let segments = this.segments.clone();
    segments.segment(Segments.actionCall, name);
    return new ODataActionRequest<A>(this.service, segments);
  }

  function<F>(name: string) {
    let segments = this.segments.clone();
    segments.segment(Segments.functionCall, name);
    return new ODataFunctionRequest<F>(this.service, segments);
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
