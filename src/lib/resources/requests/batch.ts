import { v4 as uuidv4 } from 'uuid';
import { Observable } from 'rxjs';

import { ODataClient } from '../../client';
import { Types } from '../../utils/types';
import { ODataPathSegments, SegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { map } from 'rxjs/operators';
import { $BATCH, CONTENT_TYPE, APPLICATION_JSON, NEWLINE, ODATA_VERSION, ACCEPT, HTTP11, MULTIPART_MIXED, MULTIPART_MIXED_BOUNDARY, VERSION_4_0, APPLICATION_HTTP, CONTENT_TRANSFER_ENCODING, CONTENT_ID } from '../../types';
import { ODataResource } from '../resource';
import { ODataBatch } from '../responses';
import { HttpOptions } from '../http-options';
import { HttpHeaders } from '@angular/common/http';

export enum RequestMethod {
  Get,
  Post,
  Put,
  Delete,
  Options,
  Head,
  Patch
}

class BatchRequest {
  public static readonly BOUNDARY_PREFIX_SUFFIX = '--';
  public static readonly BATCH_PREFIX = 'batch_';
  public static readonly CHANGESET_PREFIX = 'changeset_';

  constructor(
    public method: RequestMethod,
    public odataQuery: ODataResource<any>,
    public options?: HttpOptions & { body?: any }) { }

  getHeaders(method: RequestMethod): string {
    let res = '';

    if (method === RequestMethod.Post || method === RequestMethod.Patch || method === RequestMethod.Put) {
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
  private requests: BatchRequest[];
  private batchBoundary: string;
  private changesetBoundary: string;
  private changesetID: number;

  constructor(service: ODataClient, segments?: ODataPathSegments, options?: ODataQueryOptions) {
    super(service, segments, options);
    this.requests = [];
    this.batchBoundary = BatchRequest.BATCH_PREFIX + uuidv4();
    this.changesetBoundary = null;
    this.changesetID = 1;
  }

  static factory(service: ODataClient) {
    let segments = new ODataPathSegments();
    segments.segment(SegmentNames.batch, $BATCH);
    return new ODataBatchResource(service, segments);
  }

  add(method: RequestMethod, query: ODataResource<any>, options?: HttpOptions & { body?: any }): ODataBatchResource {
    this.requests.push(new BatchRequest(method, query, options));
    return this;
  }

  execute(options: HttpOptions = {}): Observable<ODataBatch> {

    let headers = this.client.mergeHttpHeaders(options.headers, {
      [ODATA_VERSION]: VERSION_4_0,
      [CONTENT_TYPE]: MULTIPART_MIXED_BOUNDARY + this.batchBoundary,
      [ACCEPT]: MULTIPART_MIXED
    });

    return this.client.post(this, this.getBody(), {
      headers: headers,
      observe: 'response',
      params: options.params,
      reportProgress: options.reportProgress,
      responseType: 'text',
      withCredentials: options.withCredentials
    }).pipe(map(resp => new ODataBatch(resp)));
  }

  getBody(): string {
    let res = '';

    for (const request of this.requests) {
      const method: RequestMethod = request.method;
      const odataQuery: ODataResource<any> = request.odataQuery;
      const body: any = request.options.body;

      // if method is GET and there is a changeset boundary open then close it
      if (method === RequestMethod.Get && !Types.isNullOrUndefined(this.changesetBoundary)) {
        res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + BatchRequest.BOUNDARY_PREFIX_SUFFIX + NEWLINE;
        this.changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (Types.isNullOrUndefined(this.changesetBoundary)) {
        res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + NEWLINE;
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (method !== RequestMethod.Get) {
        if (Types.isNullOrUndefined(this.changesetBoundary)) {
          this.changesetBoundary = BatchRequest.CHANGESET_PREFIX + uuidv4();
          res += CONTENT_TYPE + ': ' + MULTIPART_MIXED_BOUNDARY + this.changesetBoundary + NEWLINE;
          res += NEWLINE;
        }
        res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + NEWLINE;
      }

      res += CONTENT_TYPE + ': ' + APPLICATION_HTTP + NEWLINE;
      res += CONTENT_TRANSFER_ENCODING + ': ' + ODataBatchResource.BINARY + NEWLINE;

      if (method !== RequestMethod.Get) {
        res += CONTENT_ID + ': ' + this.changesetID++ + NEWLINE;
      }

      res += NEWLINE;
      res += RequestMethod[method] + ' ' + odataQuery + ' ' + HTTP11 + NEWLINE;

      res += request.getHeaders(method);

      res += NEWLINE;
      if (method === RequestMethod.Get || method === RequestMethod.Delete) {
        res += NEWLINE;
      } else {
        res += JSON.stringify(body) + NEWLINE;
      }
    }

    if (res.length) {
      if (!Types.isNullOrUndefined(this.changesetBoundary)) {
        res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + BatchRequest.BOUNDARY_PREFIX_SUFFIX + NEWLINE;
        this.changesetBoundary = null;
      }
      res += BatchRequest.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + BatchRequest.BOUNDARY_PREFIX_SUFFIX;
    }

    return res;
  }

  getRequests(): BatchRequest[] {
    return this.requests;
  }

  setBatchBoundary(batchBoundary: string): void {
    this.batchBoundary = batchBoundary;
  }
}
