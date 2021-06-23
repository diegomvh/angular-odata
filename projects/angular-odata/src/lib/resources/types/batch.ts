import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataResource } from '../resource';
import { HttpHeaders, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { BOUNDARY_PREFIX_SUFFIX, APPLICATION_JSON, HTTP11, CONTENT_TYPE, NEWLINE, BATCH_PREFIX, $BATCH, MULTIPART_MIXED_BOUNDARY, VERSION_4_0, MULTIPART_MIXED, ODATA_VERSION, ACCEPT, CONTENT_TRANSFER_ENCODING, APPLICATION_HTTP, CONTENT_ID, BINARY, CHANGESET_PREFIX, NEWLINE_REGEXP } from '../../constants';
import { ODataRequest } from '../request';
import { ODataApi } from '../../api';
import { ODataResponse } from '../responses';
import { HttpOptions } from './options';
import { Http } from '../../utils/http';

const XSSI_PREFIX = /^\)\]\}',?\n/;

// From https://github.com/adamhalasz/uniqid
var glast: number;
function now() {
  let time = Date.now();
  let last = glast || time;
  return glast = time > last ? time : last + 1;
}
function uniqid(prefix?: string, suffix?: string): string { return (prefix ? prefix : '') + now().toString(36) + (suffix ? suffix : ''); }

function getHeaderValue(header: string): string {
  let res: string = header.split(';')[0].trim();
  res = res.split(':')[1].trim();
  return res;
}

function getBoundaryDelimiter(contentType: string): string {
  const contentTypeParts: string[] = contentType.split(';');
  if (contentTypeParts.length === 2) {
    const boundary: string = contentType.split(';')[1].trim();
    const boundaryDelimiter: string = BOUNDARY_PREFIX_SUFFIX + boundary.split('=')[1];
    return boundaryDelimiter;
  } else {
    return '';
  }
}

function getBoundaryEnd(boundaryDelimiter: string): string {
  if (!boundaryDelimiter.length) {
    return '';
  }
  const boundaryEnd: string = boundaryDelimiter + BOUNDARY_PREFIX_SUFFIX;
  return boundaryEnd;
}

export class ODataBatchRequest<T> extends Subject<ODataResponse<T>> {
  constructor(public request: ODataRequest<any>)
   {
    super();
  }

  toString() {
    //TODO: Relative or Absolute url ?
    let res = [`${this.request.method} ${this.request.pathWithParams} ${HTTP11}`];
    if (this.request.method === 'POST' || this.request.method === 'PATCH' || this.request.method === 'PUT') {
      res.push(`${CONTENT_TYPE}: ${APPLICATION_JSON}`);
    }

    if (this.request.headers instanceof HttpHeaders) {
      let headers = this.request.headers;
      res = [
        ...res,
        ...headers.keys().map(key => `${key}: ${(headers.getAll(key) || []).join(',')}`)
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
        statusText: status.text,
        url: this.request.urlWithParams
      });
      this.next(ODataResponse.fromHttpResponse(this.request, res));
      this.complete();
    } else {
      // An unsuccessful request is delivered on the error channel.
      this.error(new HttpErrorResponse({
        // The error in this case is the response body (error from the server).
        error: body,
        headers,
        status: status.code,
        statusText: status.text,
        url: this.request.urlWithParams
      }));
    }
  }

  onError(content: string[], status: { code: number, text: string }) {
    const res = new HttpErrorResponse({
      error: content.join(NEWLINE),
      status: status.code || 0,
      statusText: status.text || 'Unknown Error',
      url: this.request.urlWithParams || undefined,
    });
    this.error(res);
  }
}

export class ODataBatchResource extends ODataResource<any> {
  // VARIABLES
  private requests: ODataBatchRequest<any>[];
  batchBoundary: string;

  constructor(api: ODataApi, segments?: ODataPathSegments) {
    super(api, segments);
    this.batchBoundary = uniqid(BATCH_PREFIX);
    this.requests = [];
  }

  clone() {
    //TODO: Clone
    return new ODataBatchResource(this.api, this.cloneSegments());
  }

  schema() { return undefined; }

  //#region Factory
  static factory(api: ODataApi) {
    let segments = new ODataPathSegments();
    segments.add(PathSegmentNames.batch, $BATCH);
    return new ODataBatchResource(api, segments);
  }
  //#endregion

  post(func: (batch: ODataBatchResource) => void, options?: HttpOptions): Observable<ODataResponse<any>> {
    const current = this.api.request;
    this.api.request = (req: ODataRequest<any>): Observable<any> => {
      if (req.api !== this.api)
        throw new Error("Batch Request are for the same api.");
      if (req.observe === 'events')
        throw new Error("Batch Request does not allows observe == 'events'.");
      this.requests.push(new ODataBatchRequest<any>(req));
      return this.requests[this.requests.length - 1];
    }
    try {
      func(this);
    } finally {
      this.api.request = current;
    }

    const headers = Http.mergeHttpHeaders((options && options.headers) || {}, {
      [ODATA_VERSION]: VERSION_4_0,
      [CONTENT_TYPE]: MULTIPART_MIXED_BOUNDARY + this.batchBoundary,
      [ACCEPT]: MULTIPART_MIXED
    });
    const request = new ODataRequest({
      method: "POST",
      body: this.body(),
      api: this.api,
      resource: this,
      observe: 'response',
      responseType: 'text',
      headers: headers,
      params: options ? options.params : undefined,
      withCredentials: options ? options.withCredentials : undefined
    });

    return this.api.request(request).pipe(
      map((resp: ODataResponse<any>) => {
        this.handleResponse(resp);
        return resp;
      })
    );
  }

  body(): string {
    let res = [];
    let changesetBoundary: string | null = null;
    let changesetId = 1;

    for (const batch of this.requests) {
      // if method is GET and there is a changeset boundary open then close it
      if (batch.request.method === 'GET' && changesetBoundary !== null) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
        changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (changesetBoundary === null) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${this.batchBoundary}`);
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (batch.request.method !== 'GET') {
        if (changesetBoundary === null) {
          changesetBoundary = uniqid(CHANGESET_PREFIX);
          res.push(`${CONTENT_TYPE}: ${MULTIPART_MIXED_BOUNDARY}${changesetBoundary}`);
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
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
        changesetBoundary = null;
      }
      res.push(`${BOUNDARY_PREFIX_SUFFIX}${this.batchBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
    }
    return res.join(NEWLINE);
  }

  handleResponse(response: ODataResponse<any>) {
    let chunks: string[][] = [];
    const contentType: string = response.headers.get(CONTENT_TYPE) || "";
    const batchBoundary: string = getBoundaryDelimiter(contentType);
    const endLine: string = getBoundaryEnd(batchBoundary);

    const lines: string[] = response.body.split(NEWLINE_REGEXP);

    let changesetResponses: string[][] | null = null;
    let contentId: number | null = null;
    let changesetBoundary: string | null = null;
    let changesetEndLine: string | null = null;
    let startIndex: number | null = null;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      if (line.startsWith(CONTENT_TYPE)) {
        const contentTypeValue: string = getHeaderValue(line);
        if (contentTypeValue === MULTIPART_MIXED) {
          changesetResponses = [];
          contentId = null;
          changesetBoundary = getBoundaryDelimiter(line);
          changesetEndLine = getBoundaryEnd(changesetBoundary);
          startIndex = null;
        }
        continue;
      } else if (changesetResponses !== null && line.startsWith(CONTENT_ID)) {
        contentId = Number(getHeaderValue(line));
      } else if (line.startsWith(HTTP11)) {
        startIndex = index;
      } else if (line === batchBoundary || line === changesetBoundary
        || line === endLine || line === changesetEndLine) {
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
      const req = this.requests[index];
      const statusParts = chunk[0].split(' ');
      req.onLoad(chunk.slice(1), {
        code: Number(statusParts[1]),
        text: statusParts[2]
      });
    });
  }
}
