import { Observable, Subject } from 'rxjs';

import { ODataClient } from '../../client';
import { Types } from '../../utils/types';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { $BATCH, CONTENT_TYPE, APPLICATION_JSON, NEWLINE, ODATA_VERSION, ACCEPT, HTTP11, MULTIPART_MIXED, MULTIPART_MIXED_BOUNDARY, VERSION_4_0, APPLICATION_HTTP, CONTENT_TRANSFER_ENCODING, CONTENT_ID, BATCH_PREFIX, BOUNDARY_PREFIX_SUFFIX, CHANGESET_PREFIX, BINARY, PARAM_SEPARATOR } from '../../types';
import { ODataResource } from '../resource';
import { HttpOptions } from '../http-options';
import { HttpHeaders, HttpResponse, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';

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

const createODataResponse = (batchBodyLines: string[], batchPartStartIndex: number, batchPartEndIndex: number): HttpResponse<any> => {
  let index: number = batchPartStartIndex;
  const statusLine: string = batchBodyLines[index];
  const statusLineParts: string[] = batchBodyLines[index].split(' ');
  const status: string = statusLineParts[1];
  const statusTextIndex = statusLine.indexOf(status) + status.length + 1;
  const statusText: string = statusLine.substring(statusTextIndex);

  let httpHeaders: HttpHeaders = new HttpHeaders();
  for (++index; index <= batchPartEndIndex; index++) {
    const batchBodyLine: string = batchBodyLines[index];

    if (batchBodyLine === '') {
      break;
    }

    const batchBodyLineParts: string[] = batchBodyLine.split(': ');
    httpHeaders = httpHeaders.append(batchBodyLineParts[0].trim(), batchBodyLineParts[1].trim());
  }

  let body = '';
  for (; index <= batchPartEndIndex; index++) {
    body += batchBodyLines[index];
  }

  return new HttpResponse({
    body,
    headers: httpHeaders,
    status: Number(status),
    statusText
  });
}

export class ODataBatchRequest extends Subject<any> {
  constructor(
    public method: string,
    public path: string,
    public options: { 
      body?: any | null,
      config?: string,
      headers?: HttpHeaders,
      observe?: 'body' | 'response',
      params?: HttpParams,
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text'} = {}
    ) {
      super();
    }

  toString() {
    // Url
    let url = `/${this.path}`;
    if (this.options.params instanceof HttpParams && this.options.params.keys().length > 0) {
      url = `${url}?${this.options.params}`;
    }

    let res = [`${this.method} ${url} ${HTTP11}`];
    if (this.method === 'POST' || this.method === 'PATCH' || this.method === 'PUT') {
      res.push(`${CONTENT_TYPE}: ${APPLICATION_JSON}`);
    }

    if (this.options.headers instanceof HttpHeaders) {
      let headers = this.options.headers;
      res = [
        ...res, 
        ...headers.keys().map(key => `${key}: ${headers.getAll(key).join(',')}`)
      ];
    }

    return res.join(NEWLINE);
  }
}

export class ODataBatchResource extends ODataResource<any> {
  // VARIABLES
  private requests: ODataBatchRequest[];

  constructor(service: ODataClient, segments?: ODataPathSegments) {
    super(service, segments);
    this.requests = [];
  }

  static factory(client: ODataClient) {
    let segments = new ODataPathSegments();
    segments.segment(PathSegmentNames.batch, $BATCH);
    return new ODataBatchResource(client, segments);
  }

  add(method: string, path: string, options?: {
      body?: any | null,
      config?: string,
      headers?: HttpHeaders,
      observe?: 'body' | 'response',
      params?: HttpParams,
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' }
  ): ODataBatchRequest {
    //TODO: Allow only with same config name
    let request = new ODataBatchRequest(method, path, options);
    this.requests.push(request);
    return request; 
  }

  exec(options: HttpOptions = {}) {
    const batchBoundary = uniqid(BATCH_PREFIX);
    let headers = this.client.mergeHttpHeaders(options.headers, {
      [ODATA_VERSION]: VERSION_4_0,
      [CONTENT_TYPE]: MULTIPART_MIXED_BOUNDARY + batchBoundary,
      [ACCEPT]: MULTIPART_MIXED
    });

    return this.client.post(this, this.body(batchBoundary), {
      config: options.config,
      headers: headers,
      observe: 'response',
      params: options.params,
      reportProgress: options.reportProgress,
      responseType: 'text',
      withCredentials: options.withCredentials
    }).pipe(
      map(resp => 
        this.parse(resp).map((res, index) => {
          let req = this.requests[index];
          req.next((req.options.observe === 'body') ? res.body : res);
          return res; 
        })
      ));
  }

  body(batchBoundary: string): string {
    let res = [];
    let changesetBoundary = null;
    let changesetID = 1;

    for (const request of this.requests) {
      // if method is GET and there is a changeset boundary open then close it
      if (request.method === 'GET' && !Types.isNullOrUndefined(changesetBoundary)) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
        changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (Types.isNullOrUndefined(changesetBoundary)) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${batchBoundary}`);
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
        res.push(`${CONTENT_ID}: ${changesetID++}`);
      }

      res.push(NEWLINE);
      res.push(`${request}`);

      if (request.method === 'GET' || request.method === 'DELETE') {
        res.push(NEWLINE);
      } else {
        res.push(JSON.stringify(request.options.body));
      }
    }

    if (res.length) {
      if (!Types.isNullOrUndefined(changesetBoundary)) {
        res.push(`${BOUNDARY_PREFIX_SUFFIX}${changesetBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
        changesetBoundary = null;
      }
      res.push(`${BOUNDARY_PREFIX_SUFFIX}${batchBoundary}${BOUNDARY_PREFIX_SUFFIX}`);
    }
    return res.join(NEWLINE);
  }

  parse(response: HttpResponse<any>): HttpResponse<any>[] {
    let responses: HttpResponse<any>[] = [];
    const contentType: string = response.headers.get(CONTENT_TYPE);
    const boundaryDelimiterBatch: string = getBoundaryDelimiter(contentType);
    const boundaryEndBatch: string = getBoundaryEnd(boundaryDelimiterBatch);

    const batchBody: string = response.body;
    const batchBodyLines: string[] = batchBody.split(NEWLINE);

    let odataResponseCS: HttpResponse<any>[];
    let contentId: number;
    let boundaryDelimiterCS;
    let boundaryEndCS;
    let batchPartStartIndex;
    for (let index = 0; index < batchBodyLines.length; index++) {
      const batchBodyLine: string = batchBodyLines[index];

      if (batchBodyLine.startsWith(CONTENT_TYPE)) {
        const contentTypeValue: string = getHeaderValue(batchBodyLine);
        if (contentTypeValue === MULTIPART_MIXED) {
          odataResponseCS = [];
          contentId = undefined;
          boundaryDelimiterCS = getBoundaryDelimiter(batchBodyLine);
          boundaryEndCS = getBoundaryEnd(boundaryDelimiterCS);
          batchPartStartIndex = undefined;
        }
        continue;
      } else if (!Types.isNullOrUndefined(odataResponseCS) && batchBodyLine.startsWith(CONTENT_ID)) {
        contentId = Number(getHeaderValue(batchBodyLine));
      } else if (batchBodyLine.startsWith(HTTP11)) {
        batchPartStartIndex = index;
      } else if (batchBodyLine === boundaryDelimiterBatch || batchBodyLine === boundaryDelimiterCS
        || batchBodyLine === boundaryEndBatch || batchBodyLine === boundaryEndCS) {
        if (!batchPartStartIndex) {
          continue;
        }

        const odataResponse: HttpResponse<any> = createODataResponse(batchBodyLines, batchPartStartIndex, index - 1);
        if (!Types.isNullOrUndefined(odataResponseCS)) {
          odataResponseCS[contentId] = odataResponse;
        } else {
          responses.push(odataResponse);
        }

        if (batchBodyLine === boundaryDelimiterBatch || batchBodyLine === boundaryDelimiterCS) {
          batchPartStartIndex = index + 1;
        } else if (batchBodyLine === boundaryEndBatch || batchBodyLine === boundaryEndCS) {
          if (!Types.isNullOrUndefined(odataResponseCS)) {
            for (const response of odataResponseCS) {
              if (!Types.isNullOrUndefined(response)) {
                responses.push(response);
              }
            }
          }
          odataResponseCS = undefined;
          boundaryDelimiterCS = undefined;
          boundaryEndCS = undefined;
          batchPartStartIndex = undefined;
        }
      }
    }
    return responses;
  }
}
