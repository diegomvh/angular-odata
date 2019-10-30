import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataSegments, Segments } from '../segments';
import { ODataOptions, Options } from '../options';
import { PlainObject } from '../../types';
import { ODataClient } from '../../client';
import { ODataEntityResource } from './entity';
import { $REF, ODATA_ID, $ID } from '../../types';
import { Parser, Schema } from '../../schema';

export class ODataRefResource extends ODataResource<any> {
  // Factory
  static factory(service: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      parser?: Parser<any>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || new Schema<any>();

    segments.segment(Segments.ref, $REF);
    options.clear();
    return new ODataRefResource(service, segments, options, parser);
  }

  // Client Requests
  post(target: ODataEntityResource<any>, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let related = this.client.createEndpointUrl(target);
    return super.post({[ODATA_ID]: related}, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
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
    return super.put({[ODATA_ID]: related}, {
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
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
    return super.delete({
      etag: options && options.etag,
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  //Options
  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(Options.custom, opts);
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
