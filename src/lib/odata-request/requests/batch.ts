import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { UUID } from 'angular2-uuid';
import { Observable, of } from 'rxjs';

import { ODataClient } from '../../client';
import { Utils } from '../../utils/utils';
import { ODataRequest } from '../request';
import { Segments, RequestMethod } from '../types';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { ODataBatch } from '../../odata-response';
import { map } from 'rxjs/operators';

export class BatchRequest {
  public static readonly BOUNDARY_PREFIX_SUFFIX = '--';
  public static readonly BATCH_PREFIX = 'batch_';
  public static readonly CHANGESET_PREFIX = 'changeset_';

  // HEADER VALUES
  public static readonly VERSION_4_0 = '4.0';
  public static readonly MULTIPART_MIXED = 'multipart/mixed';
  public static readonly MULTIPART_MIXED_BOUNDARY = 'multipart/mixed;boundary=';
  public static readonly APPLICATION_HTTP = 'application/http';
  public static readonly CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding';
  public static readonly CONTENT_ID = 'Content-ID';

  // HEADERS
  public static readonly HTTP11 = 'HTTP/1.1';
  public static readonly ODATA_VERSION = 'OData-Version';
  public static readonly ACCEPT = 'Accept';

  public static readonly NEWLINE = '\r\n';
  public static readonly APPLICATION_JSON = 'application/json';
  public static readonly CONTENT_TYPE = 'Content-Type';

  constructor(
    public method: RequestMethod,
    public odataQuery: ODataRequest,
    public options?: {
      body?: any,
      headers?: HttpHeaders|{[header: string]: string | string[]},
    }) { }

  getHeaders(method: RequestMethod): string {
    let res = '';

    if (method === RequestMethod.Post || method === RequestMethod.Patch || method === RequestMethod.Put) {
      res += BatchRequest.CONTENT_TYPE + ': ' + BatchRequest.APPLICATION_JSON + BatchRequest.NEWLINE;
    }

    if (Utils.isNullOrUndefined(this.options) || Utils.isNullOrUndefined(this.options.headers)) {
      return res;
    }

    for (const key of (this.options.headers as HttpHeaders).keys()) {
      res += key + ': ' + (this.options.headers as HttpHeaders).getAll(key) + BatchRequest.NEWLINE;
    }

    return res;
  }
}

export class ODataBatchRequest extends ODataRequest {
  // CONSTANT SEGMENTS
  private static readonly $BATCH = '$batch';

  private static readonly BINARY = 'binary';

  // VARIABLES
  private requests: BatchRequest[];
  private batchBoundary: string;
  private changesetBoundary: string;
  private changesetID: number;

  constructor(service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    super(service, segments, options);
    this.requests = [];
    this.batchBoundary = BatchRequest.BATCH_PREFIX + this.getUUID();
    this.changesetBoundary = null;
    this.changesetID = 1;
  }

  static factory(service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.batch, ODataBatchRequest.$BATCH);
    options.clear();
    return new ODataBatchRequest(service, segments, options);
  }

  add(method: RequestMethod, query: ODataRequest, options?: {
    body?: any,
    headers?: HttpHeaders|{[header: string]: string | string[]},
  }): ODataBatchRequest {
    this.requests.push(new BatchRequest(method, query, options));
    return this;
  }

  execute(options?: {
    headers?: HttpHeaders|{[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<ODataBatch> {

    let headers = this.mergeHttpHeaders(options.headers, {
      [BatchRequest.ODATA_VERSION]: BatchRequest.VERSION_4_0,
      [BatchRequest.CONTENT_TYPE]: BatchRequest.MULTIPART_MIXED_BOUNDARY + this.batchBoundary,
      [BatchRequest.ACCEPT]: BatchRequest.MULTIPART_MIXED
    });

    return this.client.request("POST", this, {
      body: this.getBody(),
      headers: headers,
      params: options.params,
      observe: 'response',
      reportProgress: options.reportProgress,
      responseType: 'text',
      withCredentials: options.withCredentials
    }).pipe(map(resp => new ODataBatch(resp)));
  }

  getBody(): string {
    let res = '';

    for (const request of this.requests) {
      const method: RequestMethod = request.method;
      const odataQuery: ODataRequest = request.odataQuery;
      const body: any = request.options.body;

      // if method is GET and there is a changeset boundary open then close it
      if (method === RequestMethod.Get && Utils.isNotNullNorUndefined(this.changesetBoundary)) {
        res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + BatchRequest.BOUNDARY_PREFIX_SUFFIX + BatchRequest.NEWLINE;
        this.changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (Utils.isNullOrUndefined(this.changesetBoundary)) {
        res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + BatchRequest.NEWLINE;
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (method !== RequestMethod.Get) {
        if (Utils.isNullOrUndefined(this.changesetBoundary)) {
          this.changesetBoundary = BatchRequest.CHANGESET_PREFIX + this.getUUID();
          res += BatchRequest.CONTENT_TYPE + ': ' + BatchRequest.MULTIPART_MIXED_BOUNDARY + this.changesetBoundary + BatchRequest.NEWLINE;
          res += BatchRequest.NEWLINE;
        }
        res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + BatchRequest.NEWLINE;
      }

      res += BatchRequest.CONTENT_TYPE + ': ' + BatchRequest.APPLICATION_HTTP + BatchRequest.NEWLINE;
      res += BatchRequest.CONTENT_TRANSFER_ENCODING + ': ' + ODataBatchRequest.BINARY + BatchRequest.NEWLINE;

      if (method !== RequestMethod.Get) {
        res += BatchRequest.CONTENT_ID + ': ' + this.changesetID++ + BatchRequest.NEWLINE;
      }

      res += BatchRequest.NEWLINE;
      res += RequestMethod[method] + ' ' + odataQuery + ' ' + BatchRequest.HTTP11 + BatchRequest.NEWLINE;

      res += request.getHeaders(method);

      res += BatchRequest.NEWLINE;
      if (method === RequestMethod.Get || method === RequestMethod.Delete) {
        res += BatchRequest.NEWLINE;
      } else {
        res += JSON.stringify(body) + BatchRequest.NEWLINE;
      }
    }

    if (res.length) {
      if (Utils.isNotNullNorUndefined(this.changesetBoundary)) {
        res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + BatchRequest.BOUNDARY_PREFIX_SUFFIX + BatchRequest.NEWLINE;
        this.changesetBoundary = null;
      }
      res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + BatchRequest.BOUNDARY_PREFIX_SUFFIX;
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
