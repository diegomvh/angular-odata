import { Observable, Subject } from 'rxjs';

import { ODataClient } from '../../client';
import { Types } from '../../utils/types';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { $BATCH, CONTENT_TYPE, APPLICATION_JSON, NEWLINE, ODATA_VERSION, ACCEPT, HTTP11, MULTIPART_MIXED, MULTIPART_MIXED_BOUNDARY, VERSION_4_0, APPLICATION_HTTP, CONTENT_TRANSFER_ENCODING, CONTENT_ID, BATCH_PREFIX, BOUNDARY_PREFIX_SUFFIX, CHANGESET_PREFIX, BINARY } from '../../types';
import { ODataResource } from '../resource';
import { HttpOptions } from '../http-options';
import { HttpHeaders, HttpResponse } from '@angular/common/http';

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

export class ODataBatchRequest<T> extends Subject<T> {
  constructor(
    public method: string,
    public resource: ODataResource<any>,
    public options?: HttpOptions & { body?: any }) {
      super();
    }

  headers(method: string): string {
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
  // VARIABLES
  private requests: ODataBatchRequest<any>[];
  private batchBoundary: string;
  private changesetBoundary: string;
  private changesetID: number;

  constructor(service: ODataClient, segments?: ODataPathSegments) {
    super(service, segments);
    this.requests = [];
    this.batchBoundary = uniqid(BATCH_PREFIX);
    this.changesetBoundary = null;
    this.changesetID = 1;
  }

  static factory(client: ODataClient) {
    let segments = new ODataPathSegments();
    segments.segment(PathSegmentNames.batch, $BATCH);
    return new ODataBatchResource(client, segments);
  }

  add<T>(method: string, query: ODataResource<any>, options?: HttpOptions & { body?: any }): ODataBatchRequest<T> {
    let request = new ODataBatchRequest<T>(method, query, options);
    this.requests.push(request);
    return request; 
  }

  execute(options: HttpOptions = {}) {
    let headers = this.client.mergeHttpHeaders(options.headers, {
      [ODATA_VERSION]: VERSION_4_0,
      [CONTENT_TYPE]: MULTIPART_MIXED_BOUNDARY + this.batchBoundary,
      [ACCEPT]: MULTIPART_MIXED
    });

    return this.client.post(this, this.buildBody(), {
      config: options.config,
      headers: headers,
      observe: 'response',
      params: options.params,
      reportProgress: options.reportProgress,
      responseType: 'text',
      withCredentials: options.withCredentials
    }).subscribe(resp => {
      let responses = this.parseResponses(resp);
      this.requests.forEach((req, index) => {
        req.next(responses[index].body);
      });
    });
  }

  buildBody(): string {
    let res = '';

    for (const request of this.requests) {
      const method: string = request.method;
      const resource: ODataResource<any> = request.resource;
      const body: any = request.options.body;

      // if method is GET and there is a changeset boundary open then close it
      if (method === 'GET' && !Types.isNullOrUndefined(this.changesetBoundary)) {
        res += BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + BOUNDARY_PREFIX_SUFFIX + NEWLINE;
        this.changesetBoundary = null;
      }

      // if there is no changeset boundary open then open a batch boundary
      if (Types.isNullOrUndefined(this.changesetBoundary)) {
        res += BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + NEWLINE;
      }

      // if method is not GET and there is no changeset boundary open then open a changeset boundary
      if (method !== 'GET') {
        if (Types.isNullOrUndefined(this.changesetBoundary)) {
          this.changesetBoundary = uniqid(CHANGESET_PREFIX);
          res += CONTENT_TYPE + ': ' + MULTIPART_MIXED_BOUNDARY + this.changesetBoundary + NEWLINE;
          res += NEWLINE;
        }
        res += BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + NEWLINE;
      }

      res += CONTENT_TYPE + ': ' + APPLICATION_HTTP + NEWLINE;
      res += CONTENT_TRANSFER_ENCODING + ': ' + BINARY + NEWLINE;

      if (method !== 'GET') {
        res += CONTENT_ID + ': ' + this.changesetID++ + NEWLINE;
      }

      res += NEWLINE;
      res += method + ' ' + this.client.endpointUrl(resource) + ' ' + HTTP11 + NEWLINE;

      res += request.headers(method);

      res += NEWLINE;
      if (method === 'GET' || method === 'DELETE') {
        res += NEWLINE;
      } else {
        res += JSON.stringify(body) + NEWLINE;
      }
    }

    if (res.length) {
      if (!Types.isNullOrUndefined(this.changesetBoundary)) {
        res += BOUNDARY_PREFIX_SUFFIX + this.changesetBoundary + BOUNDARY_PREFIX_SUFFIX + NEWLINE;
        this.changesetBoundary = null;
      }
      res += BOUNDARY_PREFIX_SUFFIX + this.batchBoundary + BOUNDARY_PREFIX_SUFFIX;
    }

    return res;
  }

  parseResponses(response: HttpResponse<string>): HttpResponse<string>[] {
    let responses: HttpResponse<string>[] = [];
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
