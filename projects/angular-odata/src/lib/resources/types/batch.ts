import {
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
  HttpResponseBase,
} from '@angular/common/http';
import { defer, from, Observable, of, race, ReplaySubject, Subject, Subscription } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
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
import { PathSegment } from '../../types';
import { Http } from '../../utils/http';
import { Strings } from '../../utils/strings';
import { ODataPathSegments } from '../path';
import { ODataRequest } from '../request';
import { ODataResource } from '../resource';
import { ODataOptions } from './options';
import { ODataApiOptions } from '../../options';
import { ODataResponse } from '../response';

export class ODataBatchRequest<T> extends Subject<HttpResponseBase> {
  id: string;
  group: string;
  constructor(public request: ODataRequest<any>) {
    super();
    this.id = Strings.uniqueId({ prefix: 'r' });
    this.group = Strings.uniqueId({ prefix: 'g' });
  }

  override toString() {
    return this.toLegacy();
  }

  toLegacy({ relativeUrls }: { relativeUrls?: boolean } = {}): string {
    //TODO: Relative or Absolute url ?
    let res = [
      `${this.request.method} ${
        relativeUrls ? this.request.pathWithParams : this.request.urlWithParams
      } ${HTTP11}`,
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
        ...headers.keys().map((key) => `${key}: ${(headers.getAll(key) || []).join(',')}`),
      ];
    }

    if (this.request.method === 'GET' || this.request.method === 'DELETE') {
      res.push(NEWLINE);
    } else {
      res.push(`${NEWLINE}${JSON.stringify(this.request.body)}`);
    }

    return res.join(NEWLINE);
  }

  toJson({ relativeUrls }: { relativeUrls?: boolean } = {}) {
    let res: { [name: string]: any } = {
      id: this.id,
      method: this.request.method,
      url: relativeUrls ? this.request.pathWithParams : this.request.urlWithParams,
      //'atomicityGroup': this.group
      //"dependsOn": ["g1", "g2", "r2"]
    };
    if (this.request.headers instanceof HttpHeaders) {
      let headers = this.request.headers;
      res['headers'] = headers
        .keys()
        .map((key) => `${key}: ${(headers.getAll(key) || []).join(',')}`);
    }
    if (!(this.request.method === 'GET' || this.request.method === 'DELETE')) {
      res['body'] = this.request.body;
    }

    return res;
  }

  onLoad(response: HttpResponseBase) {
    if (response.ok) {
      this.next(response);
      this.complete();
    } else {
      // An unsuccessful request is delivered on the error channel.
      this.error(response as HttpErrorResponse);
    }
  }

  onError(response: HttpErrorResponse) {
    this.error(response);
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

  private _responses: HttpResponseBase[] | null = null;
  responses() {
    return this._responses;
  }

  //#region Factory
  static factory(api: ODataApi) {
    let segments = new ODataPathSegments();
    segments.add(PathSegment.batch, $BATCH);
    return new ODataBatchResource(api, { segments });
  }

  override clone(): ODataBatchResource {
    const batch = super.clone() as ODataBatchResource;
    batch._requests = [...this._requests];
    return batch;
  }
  //#endregion

  /**
   * Add to batch request
   * @param ctx The context for the request
   * @returns The result of execute the context
   */
  add<R>(ctx: (batch: this) => R): R {
    return this.api.captureRequests(
      (req) => {
        if (req.api !== this.api) throw new Error('Batch Request are for the same api.');
        if (req.observe === 'events')
          throw new Error("Batch Request does not allows observe == 'events'.");
        const request = new ODataBatchRequest<any>(req);
        this._requests.push(request);
        return request;
      },
      () => ctx(this),
    );
  }

  /** Send collected requests, evaluating their cache policies when subscribed. */
  send(options?: ODataOptions): Observable<ODataResponse<any>> {
    return defer(() => {
      const readsCache = this._requests.some(
        ({ request }) =>
          request.isFetch() &&
          request.fetchPolicy !== 'network-only' &&
          request.fetchPolicy !== 'no-cache',
      );
      let readiness = defer(() => {
        const ready = readsCache ? this.api.cache?.ready?.() : undefined;
        return ready === undefined ? of(undefined) : from(ready);
      }).pipe(
        tap({
          error: (error: unknown) => this._requests.forEach((request) => request.error(error)),
        }),
      );
      if (this.api.errorHandler !== undefined) {
        readiness = readiness.pipe(catchError(this.api.errorHandler));
      }
      return readiness.pipe(switchMap(() => this.sendRequests(options)));
    });
  }

  private sendRequests(options?: ODataOptions): Observable<ODataResponse<any>> {
    const outgoing: ODataBatchRequest<any>[] = [];
    const responses = new Map<ODataBatchRequest<any>, Subject<HttpResponseBase>>();
    const responseErrors = new Set<unknown>();
    const cacheErrors = new ReplaySubject<never>(1);
    let dispatchingResponses = false;
    let pendingCacheError: { error: unknown } | undefined;
    const subscriptions = new Subscription();
    for (const request of this._requests) {
      subscriptions.add(
        this.api
          .executeRequest(
            request.request,
            () => {
              const response = new Subject<HttpResponseBase>();
              responses.set(request, response);
              outgoing.push(request);
              return response;
            },
            true,
          )
          .subscribe({
            next: (response) => request.next(response),
            error: (error: unknown) => {
              request.error(error);
              if (responseErrors.has(error) || this.api.isCacheMiss(error)) return;
              if (dispatchingResponses) pendingCacheError ??= { error };
              else cacheErrors.error(error);
            },
            complete: () => request.complete(),
          }),
      );
    }
    const result: Observable<{ response: ODataResponse<any>; parsed: HttpResponseBase[] }> = defer(
      () =>
        this.api.options.jsonBatchFormat
          ? this.sendJson(outgoing, options).pipe(
              map((response) => ({
                response,
                parsed: ODataBatchResource.parseJsonResponse(outgoing, response),
              })),
            )
          : this.sendLegacy(outgoing, options).pipe(
              map((response) => ({
                response,
                parsed: ODataBatchResource.parseLegacyResponse(outgoing, response),
              })),
            ),
    );
    const resultWithResponses = result.pipe(
      map(({ response, parsed }) => {
        this._responses = [...(this._responses ?? []), ...parsed];
        dispatchingResponses = true;
        outgoing.forEach((request, index) => {
          const result = parsed[index];
          const stream = responses.get(request)!;
          if (result === undefined) {
            const error = new Error('Missing batch response');
            responseErrors.add(error);
            stream.error(error);
          } else if (result.ok) {
            stream.next(result);
            stream.complete();
          } else {
            responseErrors.add(result);
            stream.error(result);
          }
        });
        dispatchingResponses = false;
        if (pendingCacheError !== undefined) cacheErrors.error(pendingCacheError.error);
        return response;
      }),
    );
    const failures =
      this.api.errorHandler === undefined
        ? cacheErrors
        : cacheErrors.pipe(catchError(this.api.errorHandler));
    return race(failures, resultWithResponses).pipe(
      tap({
        error: (error: unknown) => {
          responseErrors.add(error);
          responses.forEach((response) => response.error(error));
          this._requests.forEach((request) => request.error(error));
        },
        complete: () => this._requests.forEach((request) => request.complete()),
      }),
      finalize(() => subscriptions.unsubscribe()),
    );
  }

  private sendJson(
    requests: ODataBatchRequest<any>[],
    options?: ODataOptions,
  ): Observable<ODataResponse<Object>> {
    const headers = Http.mergeHttpHeaders((options && options.headers) || {}, {
      [ODATA_VERSION]: VERSION_4_0,
    });
    return this.api.request<object>('POST', this, {
      body: ODataBatchResource.buildJsonBody(requests, this.api.options),
      responseType: 'json',
      observe: 'response',
      headers: headers,
      params: options ? options.params : undefined,
      withCredentials: options ? options.withCredentials : undefined,
    });
  }

  private sendLegacy(
    requests: ODataBatchRequest<any>[],
    options?: ODataOptions,
  ): Observable<ODataResponse<string>> {
    const bound = Strings.uniqueId({ prefix: BATCH_PREFIX });
    const headers = Http.mergeHttpHeaders((options && options.headers) || {}, {
      [ODATA_VERSION]: VERSION_4_0,
      [CONTENT_TYPE]: MULTIPART_MIXED_BOUNDARY + bound,
      [ACCEPT]: MULTIPART_MIXED,
    });
    return this.api.request<ODataResponse<string>>('POST', this, {
      body: ODataBatchResource.buildLegacyBody(bound, requests, this.api.options),
      responseType: 'text',
      observe: 'response',
      headers: headers,
      params: options ? options.params : undefined,
      withCredentials: options ? options.withCredentials : undefined,
    });
  }

  /**
   * Execute the batch request
   * @param ctx The context for the request
   * @param options The options of the batch request
   * @returns The result of execute the context
   */
  exec<R>(ctx: (batch: this) => R, options?: ODataOptions): Observable<[R, ODataResponse<string>]> {
    let result = this.add(ctx);
    return this.send(options).pipe(map((response) => [result, response]));
  }

  body() {
    return ODataBatchResource.buildLegacyBody(
      Strings.uniqueId({ prefix: BATCH_PREFIX }),
      this._requests,
      this.api.options,
    );
  }

  json() {
    return ODataBatchResource.buildJsonBody(this._requests, this.api.options);
  }

  static buildLegacyBody(
    batchBoundary: string,
    requests: ODataBatchRequest<any>[],
    options: ODataApiOptions,
  ): string {
    let res = [];
    let changesetBoundary: string | null = null;
    let changesetId = 1;

    for (const request of requests) {
      // if method is GET and there is a changeset boundary open then close it
      if (request.request.method === 'GET' && changesetBoundary !== null) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
        changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (changesetBoundary === null) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${batchBoundary}`);
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (request.request.method !== 'GET') {
        if (changesetBoundary === null) {
          changesetBoundary = Strings.uniqueId({ prefix: CHANGESET_PREFIX });
          res.push(`${CONTENT_TYPE}: ${MULTIPART_MIXED_BOUNDARY}${changesetBoundary}`);
          res.push(NEWLINE);
        }
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}`);
      }

      res.push(`${CONTENT_TYPE}: ${APPLICATION_HTTP}`);
      res.push(`${CONTENT_TRANSFER_ENCODING}: ${BINARY}`);

      if (request.request.method !== 'GET') {
        res.push(`${CONTENT_ID}: ${changesetId++}`);
      }

      res.push(NEWLINE);
      res.push(`${request.toLegacy(options)}`);
    }

    if (res.length) {
      if (changesetBoundary !== null) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
        changesetBoundary = null;
      }
      res.push(`${BOUNDARY_PREFIX_SUFFIX}${batchBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
    }
    return res.join(NEWLINE);
  }

  static buildJsonBody(requests: ODataBatchRequest<any>[], options: ODataApiOptions): Object {
    return {
      requests: requests.map((request) => request.toJson(options)),
    };
  }

  static parseLegacyResponse(
    requests: ODataBatchRequest<any>[],
    response: ODataResponse<string>,
  ): HttpResponseBase[] {
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
    return chunks.map((chunk: string[], index: number) => {
      let request = requests[index].request;
      let { code, message } = Http.parseResponseStatus(chunk[0]);
      chunk = chunk.slice(1);

      let headers: HttpHeaders = new HttpHeaders();
      var index = 1;
      for (; index < chunk.length; index++) {
        const batchBodyLine: string = chunk[index];

        if (batchBodyLine === '') {
          break;
        }

        const batchBodyLineParts: string[] = batchBodyLine.split(': ');
        headers = headers.append(batchBodyLineParts[0].trim(), batchBodyLineParts[1].trim());
      }

      let body: string | { error: any; text: string } = '';
      for (; index < chunk.length; index++) {
        body += chunk[index];
      }

      if (code === 0) {
        code = !!body ? 200 : 0;
      }

      let ok = code >= 200 && code < 300;
      if (request.responseType === 'json' && typeof body === 'string') {
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

      return ok
        ? new HttpResponse<any>({
            body,
            headers,
            status: code,
            statusText: message,
            url: request.urlWithParams,
          })
        : new HttpErrorResponse({
            // The error in this case is the response body (error from the server).
            error: body,
            headers,
            status: code,
            statusText: message,
            url: request.urlWithParams,
          });
    });
  }

  static parseJsonResponse(
    requests: ODataBatchRequest<any>[],
    response: ODataResponse<any>,
  ): HttpResponseBase[] {
    const responses: {
      id?: string;
      status: number;
      headers?: { [name: string]: string | string[] };
      body?: unknown;
    }[] = response.body?.['responses'] ?? [];

    return requests.map(({ request, id }, index) => {
      const response =
        responses.find((response) => response.id === id) ??
        (responses[index]?.id ? undefined : responses[index]);
      if (response === undefined) {
        return new HttpErrorResponse({
          error: new Error('Missing batch response'),
          status: 0,
          url: request.urlWithParams,
        });
      }
      let code = response.status;
      const headers = new HttpHeaders(response.headers);
      let body: unknown = response.body;
      if (code === 0) {
        code = !!body ? 200 : 0;
      }

      let ok = code >= 200 && code < 300;
      if (request.responseType === 'json' && typeof body === 'string') {
        const originalBody = body;
        const text = body.replace(XSSI_PREFIX, '');
        try {
          body = text !== '' ? JSON.parse(text) : null;
        } catch (error) {
          body = originalBody;

          if (ok) {
            ok = false;
            body = { error, text: body };
          }
        }
      }

      return ok
        ? new HttpResponse<any>({
            body,
            headers,
            status: code,
            url: request.urlWithParams,
          })
        : new HttpErrorResponse({
            // The error in this case is the response body (error from the server).
            error: body,
            headers,
            status: code,
            url: request.urlWithParams,
          });
    });
  }
}
