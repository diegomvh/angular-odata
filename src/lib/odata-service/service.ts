import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ODataContext } from '../context';
import { ODataEntitySet } from '../odata-response';
import { ODataBatchRequest } from '../odata-request';
import { ODataSingletonRequest, ODataEntitySetRequest, ODataRequest, ODataObserve } from '../odata-request';
import { ODataMetadataRequest } from '../odata-request/requests/metadata';

@Injectable()
export class ODataService {
  public static readonly ODATA_CONTEXT = '@odata.context';
  public static readonly ODATA_ETAG = '@odata.etag';
  public static readonly ODATA_ID = '@odata.id';

  public static readonly $ID = '$id';
  public static readonly $COUNT = '$count';

  private static readonly PROPERTY_VALUE = 'value';
  public static readonly IF_MATCH_HEADER = 'If-Match';

  constructor(protected http: HttpClient, public context: ODataContext) {
  }

  public metadata(): ODataMetadataRequest {
    return ODataMetadataRequest.factory(this);
  }

  batch(): ODataBatchRequest {
    return ODataBatchRequest.factory(this);
  }

  singleton<T>(name: string) {
    return ODataSingletonRequest.factory<T>(name, this);
  }

  entitySet<T>(name: string): ODataEntitySetRequest<T> {
    return ODataEntitySetRequest.factory<T>(name, this);
  }

  request(method: string, query?: ODataRequest, options: {
    body?: any,
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    observe?: ODataObserve,
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'set' | 'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    const url = this.createEndpointUrl(query);

    // Resolve Observa and ResponseType
    let observe = (['set', 'property'].indexOf(options.responseType) !== -1) ? 'body' :
      options.observe;

    let responseType = (['set', 'property'].indexOf(options.responseType) !== -1) ? 'json' :
      <'arraybuffer' | 'blob' | 'json' | 'text'>options.responseType;

    let customHeaders = {};
    if (typeof (options.etag) === 'string')
      customHeaders[ODataService.IF_MATCH_HEADER] = options.etag;
    let headers = this.mergeHttpHeaders(options.headers, customHeaders);

    let customParams = {};
    let withCount = options.withCount;
    if (withCount || this.context.withCount)
      customParams[ODataService.$COUNT] = 'true';
    let params = this.mergeHttpParams(query.params(), options.params, customParams);

    let withCredentials = options.withCredentials;
    if (withCredentials === undefined)
      withCredentials = this.context.withCredentials;

    // Call http request
    let res$ = this.http.request(method, url, {
      body: options.body,
      headers: headers,
      observe: observe,
      params: params,
      reportProgress: options.reportProgress,
      responseType: responseType,
      withCredentials: withCredentials
    });

    // Context Error Handler
    res$ = this.handleError(res$);

    // ODataResponse
    switch(options.responseType) {
      case 'set':
        return res$.pipe(map((body: any) => new ODataEntitySet<any>(body)));
      case 'property':
        return res$.pipe(map((body: any) => body[ODataService.PROPERTY_VALUE]));
    }
    return res$;
  }

  protected handleError(observable: Observable<HttpResponse<any>>): Observable<HttpResponse<any>> {
    if (this.context.errorHandler) {
      observable = observable.pipe(
        catchError(this.context.errorHandler)
      );
    }
    return observable;
  }

  protected mergeHttpHeaders(...headers: (HttpHeaders | { [header: string]: string | string[]; })[]): HttpHeaders {
    let attrs = {};
    headers.forEach(header => {
      if (header instanceof HttpHeaders) {
        const httpHeader = header as HttpHeaders;
        attrs = httpHeader.keys().reduce((acc, key) => Object.assign(acc, { [key]: httpHeader.getAll(key) }), attrs);
      } else if (typeof (header) === 'object')
        attrs = Object.assign(attrs, header);
    });
    return new HttpHeaders(attrs);
  }

  protected mergeHttpParams(...params: (HttpParams | { [param: string]: string | string[]; })[]): HttpParams {
    let attrs = {};
    params.forEach(param => {
      if (param instanceof HttpParams) {
        const httpParam = param as HttpParams;
        attrs = httpParam.keys().reduce((acc, key) => Object.assign(acc, { [key]: httpParam.getAll(key) }), attrs);
      } else if (typeof (param) === 'object')
        attrs = Object.assign(attrs, param);
    });
    return new HttpParams({ fromObject: attrs });
  }

  protected createEndpointUrl(query) {
    const serviceRoot = this.context.serviceRoot();
    return `${serviceRoot}${query.path()}`;
  }
}
