import { HttpHeaders } from '@angular/common/http';
import { UUID } from 'angular2-uuid';
import { Observable } from 'rxjs';

import { ODataResponse } from '../odata-response/odata-response';
import { ODataService } from '../odata-service/odata.service';
import { Utils } from '../utils/utils';
import { ODataQueryBase } from './odata-query-base';
import { ODataQueryType } from './odata-query-type';

export enum Method {
  GET, POST, PUT, PATCH, DELETE
}

export class BatchRequest {
  constructor(
    public method: Method,
    public odataQuery: ODataQueryBase,
    public body?: any,
    public httpOptions?) { }
}

export class ODataQueryBatch implements ODataQueryType {

  // VARIABLES
  public odataService: ODataService;
  public queryString: string;
  private requests: BatchRequest[];
  private batchBoundary: string;
  private changesetBoundary: string;
  private changesetID: number;

  constructor(odataService: ODataService) {
    this.queryString = Utils.appendSegment(this.queryString, ODataQueryBase.$BATCH);
    this.requests = [];
    this.batchBoundary = ODataQueryBase.BATCH_PREFIX + this.getUUID();
    this.changesetBoundary = null;
    this.changesetID = 1;
  }

  get(query: ODataQueryBase, options?): ODataQueryBatch {
    this.requests.push(new BatchRequest(Method.GET, query, undefined, options));
    return this;
  }

  post(query: ODataQueryBase, body: any, options?): ODataQueryBatch {
    this.requests.push(new BatchRequest(Method.POST, query, body, options));
    return this;
  }

  put(query: ODataQueryBase, body: any, options?): ODataQueryBatch {
    this.requests.push(new BatchRequest(Method.PUT, query, body, options));
    return this;
  }

  patch(query: ODataQueryBase, body: any, options?): ODataQueryBatch {
    this.requests.push(new BatchRequest(Method.PATCH, query, body, options));
    return this;
  }

  delete(query: ODataQueryBase, options?): ODataQueryBatch {
    this.requests.push(new BatchRequest(Method.DELETE, query, undefined, options));
    return this;
  }

  execute(options?): Observable<ODataResponse> {
    // set headers
    if (Utils.isNullOrUndefined(options)) {
      options = {};
    }
    if (Utils.isNullOrUndefined(options.headers)) {
      options.headers = new HttpHeaders();
    }
    options.headers = options.headers.set(ODataQueryBase.ODATA_VERSION, ODataQueryBase.VERSION_4_0);
    options.headers = options.headers.set(ODataQueryBase.CONTENT_TYPE, ODataQueryBase.MULTIPART_MIXED_BOUNDARY + this.batchBoundary);
    options.headers = options.headers.set(ODataQueryBase.ACCEPT, ODataQueryBase.MULTIPART_MIXED);

    // send request
    return this.odataService.post(this, this.getBody(), options);
  }

  toString(): string {
    return this.queryString;
  }

  getBody(): string {
    let res = '';

    for (const request of this.requests) {
      const method: Method = request.method;
      const odataQuery: ODataQueryBase = request.odataQuery;
      const httpOptions = request.httpOptions;
      const body: any = request.body;

      // if method is GET and there is a changeset boundary open then close it
      if (method === Method.GET && Utils.isNotNullNorUndefined(this.changesetBoundary)) {
        res += ODataQueryBase.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataQueryBase.BOUNDARY_PREFIX_SUFFIX + ODataQueryBase.NEWLINE;
        this.changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (Utils.isNullOrUndefined(this.changesetBoundary)) {
        res += ODataQueryBase.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + ODataQueryBase.NEWLINE;
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (method !== Method.GET) {
        if (Utils.isNullOrUndefined(this.changesetBoundary)) {
          this.changesetBoundary = ODataQueryBase.CHANGESET_PREFIX + this.getUUID();
          res += ODataQueryBase.CONTENT_TYPE + ': ' + ODataQueryBase.MULTIPART_MIXED_BOUNDARY + this.changesetBoundary + ODataQueryBase.NEWLINE;
          res += ODataQueryBase.NEWLINE;
        }
        res += ODataQueryBase.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataQueryBase.NEWLINE;
      }

      res += ODataQueryBase.CONTENT_TYPE + ': ' + ODataQueryBase.APPLICATION_HTTP + ODataQueryBase.NEWLINE;
      res += ODataQueryBase.CONTENT_TRANSFER_ENCODING + ': ' + ODataQueryBase.BINARY + ODataQueryBase.NEWLINE;

      if (method !== Method.GET) {
        res += ODataQueryBase.CONTENT_ID + ': ' + this.changesetID++ + ODataQueryBase.NEWLINE;
      }

      res += ODataQueryBase.NEWLINE;
      res += Method[method] + ' ' + odataQuery + ' ' + ODataQueryBase.HTTP11 + ODataQueryBase.NEWLINE;

      res += this.getHeaders(method, httpOptions);

      res += ODataQueryBase.NEWLINE;
      if (method === Method.GET || method === Method.DELETE) {
        res += ODataQueryBase.NEWLINE;
      } else {
        res += JSON.stringify(body) + ODataQueryBase.NEWLINE;
      }
    }

    if (res.length) {
      if (Utils.isNotNullNorUndefined(this.changesetBoundary)) {
        res += ODataQueryBase.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataQueryBase.BOUNDARY_PREFIX_SUFFIX + ODataQueryBase.NEWLINE;
        this.changesetBoundary = null;
      }
      res += ODataQueryBase.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + ODataQueryBase.BOUNDARY_PREFIX_SUFFIX;
    }

    return res;
  }

  protected getHeaders(method: Method, options): string {
    let res = '';

    if (method === Method.POST || method === Method.PATCH || method === Method.PUT) {
      res += ODataQueryBase.CONTENT_TYPE + ': ' + ODataQueryBase.APPLICATION_JSON + ODataQueryBase.NEWLINE;
    }

    if (Utils.isNullOrUndefined(options) || Utils.isNullOrUndefined(options.headers)) {
      return res;
    }

    for (const key of options.headers.keys()) {
      res += key + ': ' + options.headers.getAll(key) + ODataQueryBase.NEWLINE;
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
}
