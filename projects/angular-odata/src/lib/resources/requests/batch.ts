import { Subject } from 'rxjs';

import { ODataClient } from '../../client';
import { Types } from '../../utils/types';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { $BATCH, CONTENT_TYPE, APPLICATION_JSON, NEWLINE, ODATA_VERSION, ACCEPT, HTTP11, MULTIPART_MIXED, MULTIPART_MIXED_BOUNDARY, VERSION_4_0, APPLICATION_HTTP, CONTENT_TRANSFER_ENCODING, CONTENT_ID, BATCH_PREFIX, BOUNDARY_PREFIX_SUFFIX, CHANGESET_PREFIX, BINARY, PARAM_SEPARATOR } from '../../types';
import { ODataResource } from '../resource';
import { HttpOptions } from '../http-options';
import { HttpHeaders, HttpResponse, HttpParams, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { map } from 'rxjs/operators';

const XSSI_PREFIX = /^\)\]\}',?\n/;

// From https://github.com/adamhalasz/uniqid
var glast: number;
const now = () => {
  let time = Date.now();
  let last = glast || time;
  return glast = time > last ? time : last + 1;
}
const uniqid = (prefix?: string, suffix?: string): string => (prefix ? prefix : '') + now().toString(36) + (suffix ? suffix : '');

const getHeaderValue = (header: string): string => {
  let res: string = header.split(';')[0].trim();
  res = res.split(':')[1].trim();
  return res;
}

const getBoundaryDelimiter = (contentType: string): string => {
  const contentTypeParts: string[] = contentType.split(';');
  if (contentTypeParts.length === 2) {
    const boundary: string = contentType.split(';')[1].trim();
    const boundaryDelimiter: string = BOUNDARY_PREFIX_SUFFIX + boundary.split('=')[1];
    return boundaryDelimiter;
  } else {
    return '';
  }
}

const getBoundaryEnd = (boundaryDelimiter: string): string => {
  if (!boundaryDelimiter.length) {
    return '';
  }
  const boundaryEnd: string = boundaryDelimiter + BOUNDARY_PREFIX_SUFFIX;
  return boundaryEnd;
}

export class ODataBatchRequest extends Subject<any> {
  body?: any | null;
  config?: string;
  observe: 'body' | 'response';
  headers?: HttpHeaders;
  params?: HttpParams;
  responseType: 'arraybuffer' | 'blob' | 'json' | 'text';

  constructor(
    public method: string,
    public path: string,
    options?: {
      body?: any | null,
      config?: string,
      headers?: HttpHeaders,
      params?: HttpParams,
      observe?: 'body' | 'response',
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text'
    }
  ) {
    super();
    Object.assign(this, { responseType: 'json', observe: 'body' }, options || {});
  }

  url() {
    // Url
    let url = `/${this.path}`;
    if (this.params instanceof HttpParams && this.params.keys().length > 0) {
      url = `${url}?${this.params}`;
    }
    return url;
  }

  toString() {
    let res = [`${this.method} ${this.url()} ${HTTP11}`];
    if (this.method === 'POST' || this.method === 'PATCH' || this.method === 'PUT') {
      res.push(`${CONTENT_TYPE}: ${APPLICATION_JSON}`);
    }

    if (this.headers instanceof HttpHeaders) {
      let headers = this.headers;
      res = [
        ...res,
        ...headers.keys().map(key => `${key}: ${headers.getAll(key).join(',')}`)
      ];
    }

    return res.join(NEWLINE);
  }

  onLoad(content: string[], status: { code: number, text: string }) {
    let headers: HttpHeaders = new HttpHeaders();
    var index = 1;
    for (; index < content.length; index++) {
      const batchBodyLine: string = content[index];

      if (batchBodyLine === '') {
        break;
      }

      const batchBodyLineParts: string[] = batchBodyLine.split(': ');
      headers = headers.append(batchBodyLineParts[0].trim(), batchBodyLineParts[1].trim());
    }

    let body: string | { error: any, text: string } = '';
    for (; index < content.length; index++) {
      body += content[index];
    }

    if (status.code === 0) {
      status.code = !!body ? 200 : 0;
    }

    let ok = status.code >= 200 && status.code < 300;
    if (this.responseType === 'json' && typeof body === 'string') {
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
      let resp = new HttpResponse({
        body,
        headers,
        status: status.code,
        statusText: status.text,
        url: this.url()
      });
      this.next(this.observe === 'body' ? resp.body : resp);
      this.complete();
    } else {
      // An unsuccessful request is delivered on the error channel.
      this.error(new HttpErrorResponse({
        // The error in this case is the response body (error from the server).
        error: body,
        headers,
        status: status.code,
        statusText: status.text,
        url: this.url()
      }));
    }
  }

  onError(content: string[], status: { code: number, text: string }) {
    const res = new HttpErrorResponse({
      error: content.join(NEWLINE),
      status: status.code || 0,
      statusText: status.text || 'Unknown Error',
      url: this.url() || undefined,
    });
    this.error(res);
  }
}

export class ODataBatchResource extends ODataResource<any> {
  // VARIABLES
  private requests: ODataBatchRequest[];
  public batchBoundary: string;

  constructor(service: ODataClient, segments?: ODataPathSegments) {
    super(service, segments);
    this.batchBoundary = uniqid(BATCH_PREFIX);
    this.requests = [];
  }

  //#region Factory
  static factory(client: ODataClient) {
    let segments = new ODataPathSegments();
    segments.segment(PathSegmentNames.batch, $BATCH);
    return new ODataBatchResource(client, segments);
  }
  //#endregion

  add(method: string, path: string, options?: {
    body: any | null, 
    config?: string,
    headers?: HttpHeaders,
    params?: HttpParams,
    observe?: 'body' | 'response',
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text'
  }
  ): ODataBatchRequest {
    //TODO: Allow only with same config name
    let request = new ODataBatchRequest(method, path, options);
    this.requests.push(request);
    return request;
  }

  post(func: (batch?: ODataBatchResource) => void, options?: HttpOptions) {
    this.client.using(this, func);
    let opts = Object.assign<any, HttpOptions>({ observe: 'response', responseType: 'text' }, options || {});
    opts.headers = this.client.mergeHttpHeaders(opts.headers, {
      [ODATA_VERSION]: VERSION_4_0,
      [CONTENT_TYPE]: MULTIPART_MIXED_BOUNDARY + this.batchBoundary,
      [ACCEPT]: MULTIPART_MIXED
    });
    return this.client.post(this, this.body(), opts).pipe(
      map((resp: any) => {
        this.handleResponse(resp);
        return resp;
      })
    );
  }

  body(): string {
    let res = [];
    let changesetBoundary = null;
    let changesetId = 1;

    for (const request of this.requests) {
      // if method is GET and there is a changeset boundary open then close it
      if (request.method === 'GET' && !Types.isNullOrUndefined(changesetBoundary)) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
        changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (Types.isNullOrUndefined(changesetBoundary)) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${this.batchBoundary}`);
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (request.method !== 'GET') {
        if (Types.isNullOrUndefined(changesetBoundary)) {
          changesetBoundary = uniqid(CHANGESET_PREFIX);
          res.push(`${CONTENT_TYPE}: ${MULTIPART_MIXED_BOUNDARY}${changesetBoundary}`);
          res.push(NEWLINE);
        }
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}`);
      }

      res.push(`${CONTENT_TYPE}: ${APPLICATION_HTTP}`);
      res.push(`${CONTENT_TRANSFER_ENCODING}: ${BINARY}`);

      if (request.method !== 'GET') {
        res.push(`${CONTENT_ID}: ${changesetId++}`);
      }

      res.push(NEWLINE);
      res.push(`${request}`);

      if (request.method === 'GET' || request.method === 'DELETE') {
        res.push(NEWLINE);
      } else {
        res.push(JSON.stringify(request.body));
      }
    }

    if (res.length) {
      if (!Types.isNullOrUndefined(changesetBoundary)) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
        changesetBoundary = null;
      }
      res.push(`${BOUNDARY_PREFIX_SUFFIX}${this.batchBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
    }
    return res.join(NEWLINE);
  }

  handleResponse(response: HttpResponse<any>) {
    let chunks: string[][] = [];
    const contentType: string = response.headers.get(CONTENT_TYPE);
    const batchBoundary: string = getBoundaryDelimiter(contentType);
    const endLine: string = getBoundaryEnd(batchBoundary);

    const lines: string[] = response.body.split(NEWLINE);

    let changesetResponses: string[][];
    let contentId: number;
    let changesetBoundary;
    let changesetEndLine;
    let startIndex;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      if (line.startsWith(CONTENT_TYPE)) {
        const contentTypeValue: string = getHeaderValue(line);
        if (contentTypeValue === MULTIPART_MIXED) {
          changesetResponses = [];
          contentId = undefined;
          changesetBoundary = getBoundaryDelimiter(line);
          changesetEndLine = getBoundaryEnd(changesetBoundary);
          startIndex = undefined;
        }
        continue;
      } else if (!Types.isNullOrUndefined(changesetResponses) && line.startsWith(CONTENT_ID)) {
        contentId = Number(getHeaderValue(line));
      } else if (line.startsWith(HTTP11)) {
        startIndex = index;
      } else if (line === batchBoundary || line === changesetBoundary
        || line === endLine || line === changesetEndLine) {
        if (!startIndex) {
          continue;
        }
        const chunk = lines.slice(startIndex, index);
        if (!Types.isNullOrUndefined(changesetResponses)) {
          changesetResponses[contentId] = chunk;
        } else {
          chunks.push(chunk);
        }

        if (line === batchBoundary || line === changesetBoundary) {
          startIndex = index + 1;
        } else if (line === endLine || line === changesetEndLine) {
          if (!Types.isNullOrUndefined(changesetResponses)) {
            for (const response of changesetResponses) {
              if (!Types.isNullOrUndefined(response)) {
                chunks.push(response);
              }
            }
          }
          changesetResponses = undefined;
          changesetBoundary = undefined;
          changesetEndLine = undefined;
          startIndex = undefined;
        }
      }
    }
    chunks.forEach((chunk, index) => {
      const req = this.requests[index];
      const statusParts = chunk[0].split(' ');
      req.onLoad(chunk.slice(1), {
        code: Number(statusParts[1]),
        text: statusParts[2]
      });
    });
  }
}
