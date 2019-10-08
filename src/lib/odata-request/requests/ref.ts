import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { Segments, PlainObject, Options } from '../types';
import { ODataClient } from '../../client';
import { ODataEntityRequest } from './entity';

export class ODataRefRequest extends ODataRequest {
  public static readonly ODATA_ID = '@odata.id';

  public static readonly $REF = '$ref';
  public static readonly $ID = '$id';

  // Factory
  static factory(service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.ref, ODataRefRequest.$REF);
    options.clear();
    return new ODataRefRequest(service, segments, options);
  }

  post(target: ODataEntityRequest<any>, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let related = this.client.createEndpointUrl(target);
    return super.post({[ODataRefRequest.ODATA_ID]: related}, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  put(target: ODataEntityRequest<any>, etag?: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let related = this.client.createEndpointUrl(target);
    return super.put({[ODataRefRequest.ODATA_ID]: related}, etag, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'entity',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  delete(etag?: string, options?: {
    target?: ODataEntityRequest<any>, 
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    if (options && options.target) {
      let related = this.client.createEndpointUrl(options.target);
      this.custom({[ODataRefRequest.$ID]: related});
    }
    return super.delete(etag, {
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
