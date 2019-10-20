import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from './request';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { Segments, PlainObject, Options } from '../types';
import { ODataClient } from '../../client';
import { ODataEntityRequest } from './entity';
import { $REF, ODATA_ID, $ID } from '../../constants';
import { Schema } from '../schema';

export class ODataRefRequest extends ODataRequest<any> {
  // Factory
  static factory(service: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      schema?: Schema<any>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let schema = opts && opts.schema || new Schema<any>();

    segments.segment(Segments.ref, $REF);
    options.clear();
    return new ODataRefRequest(service, segments, options, schema);
  }

  post(target: ODataEntityRequest<any>, options: {
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

  put(target: ODataEntityRequest<any>, options?: {
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

  delete(string, options?: {
    etag?: string, 
    target?: ODataEntityRequest<any>, 
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

  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(Options.custom, opts);
  }
}
