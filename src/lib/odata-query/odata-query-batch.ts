import { HttpHeaders } from '@angular/common/http';
import { UUID } from 'angular2-uuid';
import { Observable } from 'rxjs';

import { ODataResponse } from '../odata-response/odata-response';
import { HttpOptionsI } from '../odata-service/http-options';
import { ODataService } from '../odata-service/odata.service';
import { Utils } from '../utils/utils';
import { ODataQueryAbstract } from './odata-query-abstract';

export enum Method {
  GET, POST, PUT, PATCH, DELETE
}

export class BatchRequest {
  constructor(
    public method: Method,
    public odataQuery: ODataQueryAbstract,
    public body?: any,
    public httpOptions?: HttpOptionsI) { }
}

export class ODataQueryBatch extends ODataQueryAbstract {
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
  private requests: BatchRequest[];
  private batchBoundary: string;
  private changesetBoundary: string;
  private changesetID: number;

  constructor(odataService: ODataService) {
    super(odataService);
    Utils.requireNotNullNorUndefined(odataService, 'odataService');
    this.queryString = Utils.appendSegment(this.queryString, ODataQueryBatch.$BATCH);
    this.requests = [];
    this.batchBoundary = ODataQueryBatch.BATCH_PREFIX + this.getUUID();
    this.changesetBoundary = null;
    this.changesetID = 1;
  }

  get(odataQuery: ODataQueryAbstract, httpOptions?: HttpOptionsI): ODataQueryBatch {
    Utils.requireNotNullNorUndefined(odataQuery, 'odataQuery');
    this.requests.push(new BatchRequest(Method.GET, odataQuery, undefined, httpOptions));
    return this;
  }

  post(odataQuery: ODataQueryAbstract, body: any, httpOptions?: HttpOptionsI): ODataQueryBatch {
    Utils.requireNotNullNorUndefined(odataQuery, 'odataQuery');
    this.requests.push(new BatchRequest(Method.POST, odataQuery, body, httpOptions));
    return this;
  }

  put(odataQuery: ODataQueryAbstract, body: any, httpOptions?: HttpOptionsI): ODataQueryBatch {
    Utils.requireNotNullNorUndefined(odataQuery, 'odataQuery');
    this.requests.push(new BatchRequest(Method.PUT, odataQuery, body, httpOptions));
    return this;
  }

  patch(odataQuery: ODataQueryAbstract, body: any, httpOptions?: HttpOptionsI): ODataQueryBatch {
    Utils.requireNotNullNorUndefined(odataQuery, 'odataQuery');
    this.requests.push(new BatchRequest(Method.PATCH, odataQuery, body, httpOptions));
    return this;
  }

  delete(odataQuery: ODataQueryAbstract, httpOptions?: HttpOptionsI): ODataQueryBatch {
    Utils.requireNotNullNorUndefined(odataQuery, 'odataQuery');
    this.requests.push(new BatchRequest(Method.DELETE, odataQuery, undefined, httpOptions));
    return this;
  }

  execute(httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    // set headers
    if (Utils.isNullOrUndefined(httpOptions)) {
      httpOptions = {};
    }
    if (Utils.isNullOrUndefined(httpOptions.headers)) {
      httpOptions.headers = new HttpHeaders();
    }
    httpOptions.headers = httpOptions.headers.set(ODataQueryBatch.ODATA_VERSION, ODataQueryBatch.VERSION_4_0);
    httpOptions.headers = httpOptions.headers.set(ODataQueryBatch.CONTENT_TYPE, ODataQueryBatch.MULTIPART_MIXED_BOUNDARY + this.batchBoundary);
    httpOptions.headers = httpOptions.headers.set(ODataQueryBatch.ACCEPT, ODataQueryBatch.MULTIPART_MIXED);

    // send request
    return this.odataService.post(this, this.getBody(), httpOptions);
  }

  toString(): string {
    return this.queryString;
  }

  getBody(): string {
    let res = '';

    for (const request of this.requests) {
      const method: Method = request.method;
      const odataQuery: ODataQueryAbstract = request.odataQuery;
      const httpOptions: HttpOptionsI = request.httpOptions;
      const body: any = request.body;

      // if method is GET and there is a changeset boundary open then close it
      if (method === Method.GET && Utils.isNotNullNorUndefined(this.changesetBoundary)) {
        res += ODataQueryBatch.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataQueryBatch.BOUNDARY_PREFIX_SUFFIX + ODataQueryBatch.NEWLINE;
        this.changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (Utils.isNullOrUndefined(this.changesetBoundary)) {
        res += ODataQueryBatch.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + ODataQueryBatch.NEWLINE;
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (method !== Method.GET) {
        if (Utils.isNullOrUndefined(this.changesetBoundary)) {
          this.changesetBoundary = ODataQueryBatch.CHANGESET_PREFIX + this.getUUID();
          res += ODataQueryBatch.CONTENT_TYPE + ': ' + ODataQueryBatch.MULTIPART_MIXED_BOUNDARY + this.changesetBoundary + ODataQueryBatch.NEWLINE;
          res += ODataQueryBatch.NEWLINE;
        }
        res += ODataQueryBatch.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataQueryBatch.NEWLINE;
      }

      res += ODataQueryBatch.CONTENT_TYPE + ': ' + ODataQueryBatch.APPLICATION_HTTP + ODataQueryBatch.NEWLINE;
      res += ODataQueryBatch.CONTENT_TRANSFER_ENCODING + ': ' + ODataQueryBatch.BINARY + ODataQueryBatch.NEWLINE;

      if (method !== Method.GET) {
        res += ODataQueryBatch.CONTENT_ID + ': ' + this.changesetID++ + ODataQueryBatch.NEWLINE;
      }

      res += ODataQueryBatch.NEWLINE;
      res += Method[method] + ' ' + odataQuery + ' ' + ODataQueryBatch.HTTP11 + ODataQueryBatch.NEWLINE;

      res += this.getHeaders(method, httpOptions);

      res += ODataQueryBatch.NEWLINE;
      if (method === Method.GET || method === Method.DELETE) {
        res += ODataQueryBatch.NEWLINE;
      } else {
        res += JSON.stringify(body) + ODataQueryBatch.NEWLINE;
      }
    }

    if (res.length) {
      if (Utils.isNotNullNorUndefined(this.changesetBoundary)) {
        res += ODataQueryBatch.BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + ODataQueryBatch.BOUNDARY_PREFIX_SUFFIX + ODataQueryBatch.NEWLINE;
        this.changesetBoundary = null;
      }
      res += ODataQueryBatch.BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + ODataQueryBatch.BOUNDARY_PREFIX_SUFFIX;
    }

    return res;
  }

  protected getHeaders(method: Method, httpOptions: HttpOptionsI): string {
    let res = '';

    if (method === Method.POST || method === Method.PATCH || method === Method.PUT) {
      res += ODataQueryBatch.CONTENT_TYPE + ': ' + ODataQueryBatch.APPLICATION_JSON + ODataQueryBatch.NEWLINE;
    }

    if (Utils.isNullOrUndefined(httpOptions) || Utils.isNullOrUndefined(httpOptions.headers)) {
      return res;
    }

    for (const key of httpOptions.headers.keys()) {
      res += key + ': ' + httpOptions.headers.getAll(key) + ODataQueryBatch.NEWLINE;
    }

    return res;
  }

  getUUID(): string {
    return UUID.UUID();
  }
}
