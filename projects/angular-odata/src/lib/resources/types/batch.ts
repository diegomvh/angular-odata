import {
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { map, Observable, of, Subject, switchMap } from 'rxjs';
import { ODataApi } from '../../api';
import {
  $BATCH,
  ACCEPT,
  APPLICATION_HTTP,
  APPLICATION_JSON,
  BATCH_PREFIX,
  BINARY,
  BOUNDARY_PREFIX_SUFFIX,
  CHANGESET_PREFIX,
  CONTENT_ID,
  CONTENT_TRANSFER_ENCODING,
  CONTENT_TYPE,
  HTTP11,
  MULTIPART_MIXED,
  MULTIPART_MIXED_BOUNDARY,
  NEWLINE,
  NEWLINE_REGEXP,
  ODATA_VERSION,
  VERSION_4_0,
  XSSI_PREFIX,
} from '../../constants';
import { PathSegmentNames } from '../../types';
import { Http } from '../../utils/http';
import { Strings } from '../../utils/strings';
import { ODataPathSegments } from '../path';
import { ODataRequest } from '../request';
import { ODataResource } from '../resource';
import { ODataResponse } from '../responses';
import { ODataOptions } from './options';

export class ODataBatchRequest<T> extends Subject<ODataResponse<T>> {
  constructor(public request: ODataRequest<any>) {
    super();
  }

  override toString() {
    //TODO: Relative or Absolute url ?
    let res = [
      `${this.request.method} ${this.request.pathWithParams} ${HTTP11}`,
    ];
    if (
      this.request.method === 'POST' ||
      this.request.method === 'PATCH' ||
      this.request.method === 'PUT'
    ) {
      res.push(`${CONTENT_TYPE}: ${APPLICATION_JSON}`);
    }

    if (this.request.headers instanceof HttpHeaders) {
      let headers = this.request.headers;
      res = [
        ...res,
        ...headers
          .keys()
          .map((key) => `${key}: ${(headers.getAll(key) || []).join(',')}`),
      ];
    }

    return res.join(NEWLINE);
  }

  onLoad(content: string[], status: { code: number; message: string }) {
    let headers: HttpHeaders = new HttpHeaders();
    var index = 1;
    for (; index < content.length; index++) {
      const batchBodyLine: string = content[index];

      if (batchBodyLine === '') {
        break;
      }

      const batchBodyLineParts: string[] = batchBodyLine.split(': ');
      headers = headers.append(
        batchBodyLineParts[0].trim(),
        batchBodyLineParts[1].trim()
      );
    }

    let body: string | { error: any; text: string } = '';
    for (; index < content.length; index++) {
      body += content[index];
    }

    if (status.code === 0) {
      status.code = !!body ? 200 : 0;
    }

    let ok = status.code >= 200 && status.code < 300;
    if (this.request.responseType === 'json' && typeof body === 'string') {
      const originalBody = body;
      body = body.replace(XSSI_PREFIX, '');
      try {
        body = body !== '' ? JSON.parse(body) : null;
      } catch (error) {
        body = originalBody;

        if (ok) {
          ok = false;
          body = { error, text: body };
        }
      }
    }

    if (ok) {
      let res = new HttpResponse<any>({
        body,
        headers,
        status: status.code,
        statusText: status.message,
        url: this.request.urlWithParams,
      });
      this.next(ODataResponse.fromHttpResponse(this.request, res));
      this.complete();
    } else {
      // An unsuccessful request is delivered on the error channel.
      this.error(
        new HttpErrorResponse({
          // The error in this case is the response body (error from the server).
          error: body,
          headers,
          status: status.code,
          statusText: status.message,
          url: this.request.urlWithParams,
        })
      );
    }
  }

  onError(content: string[], status: { code: number; text: string }) {
    const res = new HttpErrorResponse({
      error: content.join(NEWLINE),
      status: status.code || 0,
      statusText: status.text || 'Unknown Error',
      url: this.request.urlWithParams || undefined,
    });
    this.error(res);
  }
}

/**
 * OData Batch Resource
 * https://www.odata.org/getting-started/advanced-tutorial/#batch
 */
export class ODataBatchResource extends ODataResource<any> {
  // VARIABLES
  private _requests: ODataBatchRequest<any>[] = [];
  requests() {
    return this._requests.map((r) => r.request);
  }

  //#region Factory
  static factory(api: ODataApi) {
    let segments = new ODataPathSegments();
    segments.add(PathSegmentNames.batch, $BATCH);
    return new ODataBatchResource(api, { segments });
  }

  override clone(): ODataBatchResource {
    const batch = super.clone() as ODataBatchResource;
    batch._requests = [...this._requests];
    return batch;
  }
  //#endregion

  private storeRequester() {
    const current = this.api.request;
    // Switch to the batch requester
    this.api.request = (req: ODataRequest<any>): Observable<any> => {
      if (req.api !== this.api)
        throw new Error('Batch Request are for the same api.');
      if (req.observe === 'events')
        throw new Error("Batch Request does not allows observe == 'events'.");
      this._requests.push(new ODataBatchRequest<any>(req));
      return this._requests[this._requests.length - 1];
    };
    return current;
  }

  private restoreRequester(
    handler: (req: ODataRequest<any>) => Observable<any>
  ) {
    this.api.request = handler;
  }

  /**
   * Add to batch request
   * @param ctx The context for the request
   * @returns The result of execute the context
   */
  add<R>(ctx: (batch: this) => Observable<R>): Observable<R> {
    // Store original requester
    var handler = this.storeRequester();
    // Execute the context
    const obs$ = ctx(this);
    // Restore original requester
    this.restoreRequester(handler);

    return obs$;
  }

  send(options?: ODataOptions): Observable<null | ODataResponse<string>> {
    if (this._requests.length == 0) {
      return of(null);
    }

    const bound = Strings.uniqueId(BATCH_PREFIX);
    const requests = this._requests;
    // Clean requests
    this._requests = [];
    const headers = Http.mergeHttpHeaders((options && options.headers) || {}, {
      [ODATA_VERSION]: VERSION_4_0,
      [CONTENT_TYPE]: MULTIPART_MIXED_BOUNDARY + bound,
      [ACCEPT]: MULTIPART_MIXED,
    });
    const request = new ODataRequest({
      method: 'POST',
      body: ODataBatchResource.buildBody(bound, requests),
      api: this.api,
      resource: this,
      observe: 'response',
      responseType: 'text',
      headers: headers,
      params: options ? options.params : undefined,
      withCredentials: options ? options.withCredentials : undefined,
    });
    return this.api.request(request).pipe(
      map((response: ODataResponse<string>) => {
        ODataBatchResource.handleResponse(requests, response);
        return response;
      })
    );
  }

  /**
   * Execute the batch request
   * @param ctx The context for the request
   * @param options The options of the batch request
   * @returns The result of execute the context
   */
  exec<R>(
    ctx: (batch: this) => Observable<R>,
    options?: ODataOptions
  ): Observable<R> {
    const obs$ = this.add(ctx);
    return this.send(options).pipe(switchMap(() => obs$));
  }

  body() {
    return ODataBatchResource.buildBody(
      Strings.uniqueId(BATCH_PREFIX),
      this._requests
    );
  }

  static buildBody(
    batchBoundary: string,
    requests: ODataBatchRequest<any>[]
  ): string {
    let res = [];
    let changesetBoundary: string | null = null;
    let changesetId = 1;

    for (const batch of requests) {
      // if method is GET and there is a changeset boundary open then close it
      if (batch.request.method === 'GET' && changesetBoundary !== null) {
        res.push(
          `${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`
        );
        changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (changesetBoundary === null) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${batchBoundary}`);
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (batch.request.method !== 'GET') {
        if (changesetBoundary === null) {
          changesetBoundary = Strings.uniqueId(CHANGESET_PREFIX);
          res.push(
            `${CONTENT_TYPE}: ${MULTIPART_MIXED_BOUNDARY}${changesetBoundary}`
          );
          res.push(NEWLINE);
        }
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}`);
      }

      res.push(`${CONTENT_TYPE}: ${APPLICATION_HTTP}`);
      res.push(`${CONTENT_TRANSFER_ENCODING}: ${BINARY}`);

      if (batch.request.method !== 'GET') {
        res.push(`${CONTENT_ID}: ${changesetId++}`);
      }

      res.push(NEWLINE);
      res.push(`${batch}`);

      if (batch.request.method === 'GET' || batch.request.method === 'DELETE') {
        res.push(NEWLINE);
      } else {
        res.push(`${NEWLINE}${JSON.stringify(batch.request.body)}`);
      }
    }

    if (res.length) {
      if (changesetBoundary !== null) {
        res.push(
          `${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`
        );
        changesetBoundary = null;
      }
      res.push(
        `${BOUNDARY_PREFIX_SUFFIX}${batchBoundary}${BOUNDARY_PREFIX_SUFFIX}`
      );
    }
    return res.join(NEWLINE);
  }

  static handleResponse(
    requests: ODataBatchRequest<any>[],
    response: ODataResponse<string>
  ) {
    let chunks: string[][] = [];
    const contentType: string = response.headers.get(CONTENT_TYPE) || '';
    const batchBoundary: string = Http.boundaryDelimiter(contentType);
    const endLine: string = Http.boundaryEnd(batchBoundary);

    const lines: string[] = (response.body || '').split(NEWLINE_REGEXP);

    let changesetResponses: string[][] | null = null;
    let contentId: number | null = null;
    let changesetBoundary: string | null = null;
    let changesetEndLine: string | null = null;
    let startIndex: number | null = null;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      if (line.startsWith(CONTENT_TYPE)) {
        const contentTypeValue: string = Http.headerValue(line);
        if (contentTypeValue === MULTIPART_MIXED) {
          changesetResponses = [];
          contentId = null;
          changesetBoundary = Http.boundaryDelimiter(line);
          changesetEndLine = Http.boundaryEnd(changesetBoundary);
          startIndex = null;
        }
        continue;
      } else if (changesetResponses !== null && line.startsWith(CONTENT_ID)) {
        contentId = Number(Http.headerValue(line));
      } else if (line.startsWith(HTTP11)) {
        startIndex = index;
      } else if (
        line === batchBoundary ||
        line === changesetBoundary ||
        line === endLine ||
        line === changesetEndLine
      ) {
        if (!startIndex) {
          continue;
        }
        const chunk = lines.slice(startIndex, index);
        if (changesetResponses !== null && contentId !== null) {
          changesetResponses[contentId] = chunk;
        } else {
          chunks.push(chunk);
        }

        if (line === batchBoundary || line === changesetBoundary) {
          startIndex = index + 1;
        } else if (line === endLine || line === changesetEndLine) {
          if (changesetResponses !== null) {
            for (const response of changesetResponses) {
              if (response) {
                chunks.push(response);
              }
            }
          }
          changesetResponses = null;
          changesetBoundary = null;
          changesetEndLine = null;
          startIndex = null;
        }
      }
    }
    chunks.forEach((chunk, index) => {
      const req = requests[index];
      const { code, message } = Http.parseResponseStatus(chunk[0]);
      req.onLoad(chunk.slice(1), { code, message });
    });
  }
}
