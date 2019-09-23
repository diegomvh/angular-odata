import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { UUID } from 'angular2-uuid';
import { Observable, of } from 'rxjs';

import { ODataService } from '../odata-service/odata.service';
import { Utils } from '../utils/utils';
import { ODataRequest } from './odata-request';
import { PlainObject } from './odata-request-handlers';

export enum Method {
  GET, POST, PUT, PATCH, DELETE
}

export class BatchRequest {
  constructor(
    public method: Method,
    public odataQuery: ODataRequest,
    public body?: any,
    public options?: {
      headers?: HttpHeaders|{[header: string]: string | string[]},
    }) { }
}

export class ODataBatchRequest {
  private static readonly BOUNDARY_PREFIX_SUFFIX = '--';
  private static readonly BATCH_PREFIX = 'batch_';
  private static readonly CHANGESET_PREFIX = 'changeset_';
  private static readonly NEWLINE = '\r\n';

  // CONSTANT SEGMENTS
  private static readonly $BATCH = '$batch';

  // HEADERS
  private static readonly HTTP11 = 'HTTP/1.1';
  private static readonly ODATA_VERSION = 'OData-Version';
  private static readonly CONTENT_TYPE = 'Content-Type';
  private static readonly ACCEPT = 'Accept';
  private static readonly CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding';
  private static readonly CONTENT_ID = 'Content-ID';

  // HEADER VALUES
  private static readonly VERSION_4_0 = '4.0';
  private static readonly MULTIPART_MIXED = 'multipart/mixed';
  private static readonly MULTIPART_MIXED_BOUNDARY = 'multipart/mixed;boundary=';
  private static readonly APPLICATION_HTTP = 'application/http';
  private static readonly BINARY = 'binary';
  private static readonly APPLICATION_JSON = 'application/json';

  // VARIABLES
  public service: ODataService;
  private requests: BatchRequest[];
  private batchBoundary: string;
  private changesetBoundary: string;
  private changesetID: number;

  constructor(service: ODataService) {
    this.service = service;
    this.requests = [];
    this.batchBoundary = ODataBatchRequest.BATCH_PREFIX + this.getUUID();
    this.changesetBoundary = null;
    this.changesetID = 1;
  }

  get(query: ODataRequest, options?: {
    headers?: HttpHeaders|{[header: string]: string | string[]},
  }): ODataBatchRequest {
    this.requests.push(new BatchRequest(Method.GET, query, undefined, options));
    return this;
  }

  post(query: ODataRequest, body: any, options?: {
    headers?: HttpHeaders|{[header: string]: string | string[]},
  }): ODataBatchRequest {
    this.requests.push(new BatchRequest(Method.POST, query, body, options));
    return this;
  }

  put(query: ODataRequest, body: any, options?: {
    headers?: HttpHeaders|{[header: string]: string | string[]},
  }): ODataBatchRequest {
    this.requests.push(new BatchRequest(Method.PUT, query, body, options));
    return this;
  }

  patch(query: ODataRequest, body: any, options?: {
    headers?: HttpHeaders|{[header: string]: string | string[]},
  }): ODataBatchRequest {
    this.requests.push(new BatchRequest(Method.PATCH, query, body, options));
    return this;
  }

  delete(query: ODataRequest, options?: {
    headers?: HttpHeaders|{[header: string]: string | string[]},
  }): ODataBatchRequest {
    this.requests.push(new BatchRequest(Method.DELETE, query, undefined, options));
    return this;
  }

  execute(options?: {
    headers?: HttpHeaders|{[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<HttpResponse<any>> {

    let headers = this.mergeHttpHeaders(options.headers, {
      [ODataBatchRequest.ODATA_VERSION]: ODataBatchRequest.VERSION_4_0,
      [ODataBatchRequest.CONTENT_TYPE]: ODataBatchRequest.MULTIPART_MIXED_BOUNDARY + this.batchBoundary,
      [ODataBatchRequest.ACCEPT]: ODataBatchRequest.MULTIPART_MIXED
    });

    return of(new HttpResponse<any>());
    // send request
    /*
    return this.service.request("POST", ODataQueryBatch.$BATCH, {
      body: this.getBody(),
      headers: headers,
      params: options.params,
      observe: 'response',
      reportProgress: options.reportProgress,
      responseType: 'text',
      withCredentials: options.withCredentials
    }).pipe(map(resp => new ODataResponseBatch(resp)));
    */
  }

  path(): string {
    return ;
  }

  params(): PlainObject {
    return {}; 
  }

  getBody(): string {
    let res = '';

    for (const request of this.requests) {
      const method: Method = request.method;
      const odataQuery: ODataRequest = request.odataQuery;
      const httpOptions = request.options;
      const body: any = request.body;

      // if method is GET and there is a changeset boundary open then close it
      if (method === Method.GET && Utils.isNotNullNorUndefined(this.changesetBoundary)) {
        res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + ODataBatchRequest.NEWLINE;
        this.changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (Utils.isNullOrUndefined(this.changesetBoundary)) {
        res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + ODataBatchRequest.NEWLINE;
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (method !== Method.GET) {
        if (Utils.isNullOrUndefined(this.changesetBoundary)) {
          this.changesetBoundary = ODataBatchRequest.CHANGESET_PREFIX + this.getUUID();
          res += ODataBatchRequest.CONTENT_TYPE + ': ' + ODataBatchRequest.MULTIPART_MIXED_BOUNDARY + this.changesetBoundary + ODataBatchRequest.NEWLINE;
          res += ODataBatchRequest.NEWLINE;
        }
        res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataBatchRequest.NEWLINE;
      }

      res += ODataBatchRequest.CONTENT_TYPE + ': ' + ODataBatchRequest.APPLICATION_HTTP + ODataBatchRequest.NEWLINE;
      res += ODataBatchRequest.CONTENT_TRANSFER_ENCODING + ': ' + ODataBatchRequest.BINARY + ODataBatchRequest.NEWLINE;

      if (method !== Method.GET) {
        res += ODataBatchRequest.CONTENT_ID + ': ' + this.changesetID++ + ODataBatchRequest.NEWLINE;
      }

      res += ODataBatchRequest.NEWLINE;
      res += Method[method] + ' ' + odataQuery + ' ' + ODataBatchRequest.HTTP11 + ODataBatchRequest.NEWLINE;

      res += this.getHeaders(method, httpOptions);

      res += ODataBatchRequest.NEWLINE;
      if (method === Method.GET || method === Method.DELETE) {
        res += ODataBatchRequest.NEWLINE;
      } else {
        res += JSON.stringify(body) + ODataBatchRequest.NEWLINE;
      }
    }

    if (res.length) {
      if (Utils.isNotNullNorUndefined(this.changesetBoundary)) {
        res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + ODataBatchRequest.NEWLINE;
        this.changesetBoundary = null;
      }
      res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX;
    }

    return res;
  }

  protected getHeaders(method: Method, options): string {
    let res = '';

    if (method === Method.POST || method === Method.PATCH || method === Method.PUT) {
      res += ODataBatchRequest.CONTENT_TYPE + ': ' + ODataBatchRequest.APPLICATION_JSON + ODataBatchRequest.NEWLINE;
    }

    if (Utils.isNullOrUndefined(options) || Utils.isNullOrUndefined(options.headers)) {
      return res;
    }

    for (const key of options.headers.keys()) {
      res += key + ': ' + options.headers.getAll(key) + ODataBatchRequest.NEWLINE;
    }

    return res;
  }

  getUUID(): string {
    return UUID.UUID();
  }

  getRequests(): BatchRequest[] {
    return this.requests;
  }

  setBatchBoundary(batchBoundary: string): void {
    this.batchBoundary = batchBoundary;
  }

  protected mergeHttpHeaders(...headers: (HttpHeaders | { [header: string]: string | string[]; })[]): HttpHeaders {
    let attrs = {};
    headers.forEach(header => {
    if (header instanceof HttpHeaders) {
      const httpHeader = header as HttpHeaders;
      attrs = httpHeader.keys().reduce((acc, key) => Object.assign(acc, {[key]: httpHeader.getAll(key)}), attrs);
    } else if (typeof(header) === 'object')
      attrs = Object.assign(attrs, header);
    });
    return new HttpHeaders(attrs);
  }
}
