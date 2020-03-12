import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, SegmentTypes } from '../segments';
import { ODataQueryOptions, QueryOptionTypes } from '../options';
import { PlainObject } from '../../types';
import { ODataClient } from '../../client';
import { ODataEntityResource } from './entity';
import { $REF as $REFERENCE, ODATA_ID, $ID } from '../../types';
import { Parser } from '../../models';

export class ODataReferenceResource extends ODataResource<any> {
  // Factory
  static factory(service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parser?: Parser<any>}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.ref, $REFERENCE);
    options.clear();
    return new ODataReferenceResource(service, segments, options, parser);
  }

  // Client Requests
  post(target: ODataEntityResource<any>, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let related = this.client.createEndpointUrl(target);
    return this.client.post(this, {[ODATA_ID]: related}, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  put(target: ODataEntityResource<any>, options?: {
    etag?: string, 
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let related = this.client.createEndpointUrl(target);
    return this.client.put(this, {[ODATA_ID]: related}, {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  delete(options?: {
    etag?: string, 
    target?: ODataEntityResource<any>, 
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    if (options && options.target) {
      let related = this.client.createEndpointUrl(options.target);
      this.custom({[$ID]: related});
    }
    return this.client.delete(this, {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  //Options
  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(QueryOptionTypes.custom, opts);
  }

  // Custom
  add(target: ODataEntityResource<any>, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean}): Observable<any> {
    return this.post(target, options);
  }

  set(target: ODataEntityResource<any>, options?: {
    etag?: string, 
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any>  {
    return this.put(target, options);
  }

  remove(options?: {
    etag?: string, 
    target?: ODataEntityResource<any>, 
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    return this.delete(options);
  }
}
