import { HttpHeaders, HttpParams } from '@angular/common/http';
import { ODataApi } from '../api';
import {
  ACCEPT,
  IF_MATCH_HEADER,
  IF_NONE_MATCH_HEADER,
  PREFER,
} from '../constants';
import { Http } from '../utils';
import { ODataResource } from './resource';

export class ODataRequest<T> {
  readonly method: string;
  readonly api: ODataApi;
  readonly body: any | null;
  readonly observe: 'events' | 'response';
  readonly reportProgress?: boolean;
  readonly withCredentials?: boolean;
  readonly responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
  readonly fetchPolicy:
    | 'cache-first'
    | 'cache-and-network'
    | 'network-only'
    | 'no-cache'
    | 'cache-only';
  readonly headers: HttpHeaders;
  readonly params: HttpParams;
  readonly path: string;
  readonly resource: ODataResource<T>;

  constructor(init: {
    method: string;
    api: ODataApi;
    resource: ODataResource<T>;
    body: any;
    observe: 'events' | 'response';
    etag?: string;
    headers?: HttpHeaders | { [header: string]: string | string[] };
    reportProgress?: boolean;
    params?: HttpParams | { [param: string]: string | string[] };
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    fetchPolicy?:
      | 'cache-first'
      | 'cache-and-network'
      | 'network-only'
      | 'no-cache'
      | 'cache-only';
    withCredentials?: boolean;
  }) {
    this.method = init.method;
    this.resource = init.resource;

    this.api = init.api;
    this.reportProgress = init.reportProgress;
    this.responseType = init.responseType;
    this.observe = init.observe;

    // The Body
    this.body = init.body !== undefined ? init.body : null;
    if (this.body !== null) this.body = this.resource.serialize(this.body);

    this.withCredentials =
      init.withCredentials === undefined
        ? this.api.options.withCredentials
        : init.withCredentials;
    this.fetchPolicy = init.fetchPolicy || this.api.options.fetchPolicy;

    // The Path and Params from resource
    const [resourcePath, resourceParams] = this.resource.pathAndParams();
    this.path = resourcePath;

    //#region Headers
    const customHeaders: { [name: string]: string | string[] } = {};
    if (typeof init.etag === 'string') {
      if (
        this.api.options.etag.ifMatch &&
        ['PUT', 'PATCH', 'DELETE'].indexOf(this.method) !== -1
      )
        customHeaders[IF_MATCH_HEADER] = init.etag;
      else if (
        this.api.options.etag.ifNoneMatch &&
        ['GET'].indexOf(this.method) !== -1
      )
        customHeaders[IF_NONE_MATCH_HEADER] = init.etag;
    }

    const accept = [];
    // Metadata ?
    if (this.api.options.accept?.metadata !== undefined)
      accept.push(`odata.metadata=${this.api.options.accept?.metadata}`);
    // IEEE754
    if (this.api.options.accept?.ieee754Compatible !== undefined)
      accept.push(
        `IEEE754Compatible=${this.api.options.accept?.ieee754Compatible}`
      );
    if (accept.length > 0)
      customHeaders[ACCEPT] = [
        `application/json;${accept.join(';')}`,
        'text/plain',
        '*/*',
      ];

    const prefer = [];
    // Return
    if (
      this.api.options.prefer?.return !== undefined &&
      ['POST', 'PUT', 'PATCH'].indexOf(this.method) !== -1
    )
      prefer.push(`return=${this.api.options.prefer?.return}`);
    // MaxPageSize
    if (
      this.api.options.prefer?.maxPageSize !== undefined &&
      ['GET'].indexOf(this.method) !== -1
    )
      prefer.push(`odata.maxpagesize=${this.api.options.prefer?.maxPageSize}`);
    // Annotations
    if (
      this.api.options.prefer?.includeAnnotations !== undefined &&
      ['GET'].indexOf(this.method) !== -1
    )
      prefer.push(
        `odata.include-annotations=${this.api.options.prefer?.includeAnnotations}`
      );
    if (
      this.api.options.prefer?.continueOnError === true &&
      ['POST'].indexOf(this.method) !== -1
    )
      prefer.push(`odata.continue-on-error`);
    if (prefer.length > 0) customHeaders[PREFER] = prefer;
    this.headers = Http.mergeHttpHeaders(
      this.api.options.headers,
      customHeaders,
      init.headers || {}
    );
    //#endregion

    //#region Params
    const customParams: { [name: string]: string | string[] } = {};
    if (
      ['POST', 'PUT', 'PATCH'].indexOf(this.method) !== -1 &&
      '$select' in resourceParams
    ) {
      customParams['$select'] = resourceParams['$select'];
    }
    if (['POST'].indexOf(this.method) !== -1 && '$expand' in resourceParams) {
      customParams['$expand'] = resourceParams['$expand'];
    }
    if (['GET'].indexOf(this.method) !== -1) {
      Object.assign(customParams, resourceParams);
    }

    this.params = Http.mergeHttpParams(
      this.api.options.params,
      customParams,
      init.params || {}
    );
    //#endregion
  }

  get pathWithParams() {
    let path = this.path;
    if (this.params.keys().length > 0) {
      path = `${path}?${this.params}`;
    }
    return path;
  }

  get url() {
    return `${this.api.serviceRootUrl}${this.path}`;
  }

  get urlWithParams() {
    return `${this.api.serviceRootUrl}${this.pathWithParams}`;
  }
}
