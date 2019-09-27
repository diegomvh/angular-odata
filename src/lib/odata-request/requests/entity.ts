import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Utils } from '../../utils/utils';
import { PlainObject, Options, EntityKey } from '../types';

import { ODataSingleRequest } from './single';
import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { ODataNavigationPropertyRequest } from './navigationproperty';
import { ODataPropertyRequest } from './property';
import { ODataOptions } from '../options';
import { ODataSegments } from '../segments';
import { ODataClient } from '../../client';

export class ODataEntityRequest<T> extends ODataSingleRequest<T> {
  static factory<T>(service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    options.keep(Options.expand, Options.select, Options.format);
    return new ODataEntityRequest<T>(service, segments, options);
  }

  key(opts?: EntityKey) {
    let segment = this.segments.last();
    return segment.option(Options.key, opts);
  }

  navigationProperty<N>(name: string) {
    return ODataNavigationPropertyRequest.factory<N>(
      name, 
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  property<P>(name: string) {
    return ODataPropertyRequest.factory<P>(
      name, 
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  action<A>(name: string) {
    return ODataActionRequest.factory<A>(
      name, 
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  function<F>(name: string) {
    return ODataFunctionRequest.factory<F>(
      name, 
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
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
