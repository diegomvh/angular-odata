import { Observable } from 'rxjs';

import { ODataClient } from '../../client';
import { Types } from '../../utils/types';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { map } from 'rxjs/operators';
import { $BATCH, CONTENT_TYPE, APPLICATION_JSON, NEWLINE, ODATA_VERSION, ACCEPT, HTTP11, MULTIPART_MIXED, MULTIPART_MIXED_BOUNDARY, VERSION_4_0, APPLICATION_HTTP, CONTENT_TRANSFER_ENCODING, CONTENT_ID } from '../../types';
import { ODataResource } from '../resource';
import { ODataBatch } from '../responses';
import { HttpOptions } from '../http-options';
import { HttpHeaders, HttpResponse } from '@angular/common/http';

// From https://github.com/adamhalasz/uniqid
let last: number; 
const now = () => {
    var time = Date.now();
    var last = last || time;
    return last = time > last ? time : last + 1;
}
const uniqid = (prefix?: string, suffix?: string): string => (prefix ? prefix : '') + now().toString(36) + (suffix ? suffix : '');

export class ODataBatchRequest {
  public static readonly BOUNDARY_PREFIX_SUFFIX = '--';
  public static readonly BATCH_PREFIX = 'batch_';
  public static readonly CHANGESET_PREFIX = 'changeset_';

  constructor(
    public method: string,
    public resource: ODataResource<any>,
    public options?: HttpOptions & { body?: any }) { }

  getHeaders(method: string): string {
    let res = '';

    if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
      res += CONTENT_TYPE + ': ' + APPLICATION_JSON + NEWLINE;
    }

    if (Types.isNullOrUndefined(this.options) || Types.isNullOrUndefined(this.options.headers)) {
      return res;
    }

    for (const key of (this.options.headers as HttpHeaders).keys()) {
      res += key + ': ' + (this.options.headers as HttpHeaders).getAll(key) + NEWLINE;
    }

    return res;
  }
}

export class ODataBatchResource extends ODataResource<any> {
  private static readonly BINARY = 'binary';

  // VARIABLES
  private requests: ODataBatchRequest[];
  private batchBoundary: string;
  private changesetBoundary: string;
  private changesetID: number;

  constructor(service: ODataClient, segments?: ODataPathSegments) {
    super(service, segments);
    this.requests = [];
    this.batchBoundary = uniqid(ODataBatchRequest.BATCH_PREFIX);
    this.changesetBoundary = null;
    this.changesetID = 1;
  }

  static factory(client: ODataClient) {
    let segments = new ODataPathSegments();
    segments.segment(PathSegmentNames.batch, $BATCH);
    return new ODataBatchResource(client, segments);
  }

  add(method: string, query: ODataResource<any>, options?: HttpOptions & { body?: any }): ODataBatchRequest {
    this.requests.push(new ODataBatchRequest(method, query, options));
    return this.request[this.requests.length - 1];
  }

  execute(options: HttpOptions = {}): Observable<ODataBatch> {

    let headers = this.client.mergeHttpHeaders(options.headers, {
      [ODATA_VERSION]: VERSION_4_0,
      [CONTENT_TYPE]: MULTIPART_MIXED_BOUNDARY + this.batchBoundary,
      [ACCEPT]: MULTIPART_MIXED
    });

    return this.client.post(this, this.body(), {
      config: options.config,
      headers: headers,
      observe: 'response',
      params: options.params,
      reportProgress: options.reportProgress,
      responseType: 'text',
      withCredentials: options.withCredentials
    }).pipe(map(resp => new ODataBatch(resp)));
  }

  body(): string {
    let res = '';

    for (const request of this.requests) {
      const method: string = request.method;
      const resource: ODataResource<any> = request.resource;
      const body: any = request.options.body;

      // if method is GET and there is a changeset boundary open then close it
      if (method === 'GET' && !Types.isNullOrUndefined(this.changesetBoundary)) {
        res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + NEWLINE;
        this.changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (Types.isNullOrUndefined(this.changesetBoundary)) {
        res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + NEWLINE;
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (method !== 'GET') {
        if (Types.isNullOrUndefined(this.changesetBoundary)) {
          this.changesetBoundary = uniqid(ODataBatchRequest.CHANGESET_PREFIX);
          res += CONTENT_TYPE + ': ' + MULTIPART_MIXED_BOUNDARY + this.changesetBoundary + NEWLINE;
          res += NEWLINE;
        }
        res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + NEWLINE;
      }

      res += CONTENT_TYPE + ': ' + APPLICATION_HTTP + NEWLINE;
      res += CONTENT_TRANSFER_ENCODING + ': ' + ODataBatchResource.BINARY + NEWLINE;

      if (method !== 'GET') {
        res += CONTENT_ID + ': ' + this.changesetID++ + NEWLINE;
      }

      res += NEWLINE;
      res += method + ' ' + this.client.endpointUrl(resource) + ' ' + HTTP11 + NEWLINE;

      res += request.getHeaders(method);

      res += NEWLINE;
      if (method === 'GET' || method === 'DELETE') {
        res += NEWLINE;
      } else {
        res += JSON.stringify(body) + NEWLINE;
      }
    }

    if (res.length) {
      if (!Types.isNullOrUndefined(this.changesetBoundary)) {
        res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + NEWLINE;
        this.changesetBoundary = null;
      }
      res += ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + ODataBatchRequest.BOUNDARY_PREFIX_SUFFIX;
    }

    return res;
  }
}
