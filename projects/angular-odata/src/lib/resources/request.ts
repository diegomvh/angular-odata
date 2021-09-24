import { HttpHeaders, HttpParams } from '@angular/common/http';
import { ODataApi } from '../api';
import {
  $BATCH,
  $QUERY,
  ACCEPT,
  IF_MATCH_HEADER,
  IF_NONE_MATCH_HEADER,
  PREFER,
  TEXT_PLAIN,
} from '../constants';
import { QueryOptionNames } from '../types';
import { Http } from '../utils';
import { ODataResource } from './resource';

export class ODataRequest<T> {
  readonly api: ODataApi;
  readonly observe: 'events' | 'response';
  readonly reportProgress?: boolean;
  readonly withCredentials?: boolean;
  readonly bodyQueryOptions: QueryOptionNames[];
  readonly responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
  readonly fetchPolicy:
    | 'cache-first'
    | 'cache-and-network'
    | 'network-only'
    | 'no-cache'
    | 'cache-only';
  readonly resource: ODataResource<T>;
  private readonly _method: string;
  private readonly _body: any | null;
  private readonly _headers: HttpHeaders;
  private readonly _params: HttpParams;
  private readonly _path: string;
  private readonly _queryBody: boolean;

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
    bodyQueryOptions?: QueryOptionNames[];
  }) {
    this._method = init.method;
    this.resource = init.resource;

    this.api = init.api;
    this.reportProgress = init.reportProgress;
    this.responseType = init.responseType;
    this.observe = init.observe;

    // The Body
    this._body = init.body !== undefined ? init.body : null;
    if (this._body !== null) this._body = this.resource.serialize(this._body);

    this.withCredentials =
      init.withCredentials === undefined
        ? this.api.options.withCredentials
        : init.withCredentials;
    this.fetchPolicy = init.fetchPolicy || this.api.options.fetchPolicy;
    this.bodyQueryOptions =
      init.bodyQueryOptions || this.api.options.bodyQueryOptions;

    // The Path and Params from resource
    const [resourcePath, resourceParams] = this.resource.pathAndParams();
    this._path = resourcePath;

    //#region Headers
    const customHeaders: { [name: string]: string | string[] } = {};
    if (typeof init.etag === 'string') {
      if (
        this.api.options.etag.ifMatch &&
        ['PUT', 'PATCH', 'DELETE'].indexOf(this._method) !== -1
      )
        customHeaders[IF_MATCH_HEADER] = init.etag;
      else if (
        this.api.options.etag.ifNoneMatch &&
        ['GET'].indexOf(this._method) !== -1
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
      ['POST', 'PUT', 'PATCH'].indexOf(this._method) !== -1
    )
      prefer.push(`return=${this.api.options.prefer?.return}`);
    // MaxPageSize
    if (
      this.api.options.prefer?.maxPageSize !== undefined &&
      ['GET'].indexOf(this._method) !== -1
    )
      prefer.push(`odata.maxpagesize=${this.api.options.prefer?.maxPageSize}`);
    // Annotations
    if (
      this.api.options.prefer?.includeAnnotations !== undefined &&
      ['GET'].indexOf(this._method) !== -1
    )
      prefer.push(
        `odata.include-annotations=${this.api.options.prefer?.includeAnnotations}`
      );
    if (
      this.api.options.prefer?.continueOnError === true &&
      ['POST'].indexOf(this._method) !== -1
    )
      prefer.push(`odata.continue-on-error`);
    if (prefer.length > 0) customHeaders[PREFER] = prefer;
    this._headers = Http.mergeHttpHeaders(
      this.api.options.headers,
      customHeaders,
      init.headers || {}
    );
    //#endregion

    //#region Params
    const customParams: { [name: string]: string | string[] } = {};
    if (
      ['POST', 'PUT', 'PATCH'].indexOf(this._method) !== -1 &&
      '$select' in resourceParams
    ) {
      customParams['$select'] = resourceParams['$select'];
    }
    if (['POST'].indexOf(this._method) !== -1 && '$expand' in resourceParams) {
      customParams['$expand'] = resourceParams['$expand'];
    }
    if (['GET'].indexOf(this._method) !== -1) {
      Object.assign(customParams, resourceParams);
    }

    this._params = Http.mergeHttpParams(
      this.api.options.params,
      customParams,
      init.params || {}
    );
    //#endregion

    this._queryBody =
      this._method === 'GET' &&
      this.bodyQueryOptions.length > 0 &&
      this.bodyQueryOptions.some((name) => this._params.has(`$${name}`));
  }

  get path() {
    return this._queryBody ? `${this._path}/${$QUERY}` : this._path;
  }

  get method() {
    return this._queryBody ? 'POST' : this._method;
  }

  get body() {
    if (this._queryBody) {
      let [, bodyParams] = Http.splitHttpParams(
        this._params,
        this.bodyQueryOptions.map((name) => `$${name}`)
      );
      return bodyParams.toString();
    } else {
      return this._body;
    }
  }

  get params() {
    if (this._queryBody) {
      let [queryParams] = Http.splitHttpParams(
        this._params,
        this.bodyQueryOptions.map((name) => `$${name}`)
      );
      return queryParams;
    } else {
      return this._params;
    }
  }

  get headers() {
    if (this._queryBody) {
      return Http.mergeHttpHeaders(this._headers, { CONTENT_TYPE: TEXT_PLAIN });
    } else {
      return this._headers;
    }
  }

  get pathWithParams() {
    let path = this._path;
    if (this._params.keys().length > 0) {
      path = `${path}?${this._params}`;
    }
    return path;
  }

  get url() {
    return `${this.api.serviceRootUrl}${this._path}`;
  }

  get urlWithParams() {
    return `${this.api.serviceRootUrl}${this.pathWithParams}`;
  }

  isBatch() {
    return this._path.endsWith($BATCH);
  }

  isFetch() {
    return ['GET'].indexOf(this._method) !== -1;
  }

  isMutate() {
    return ['PUT', 'PATCH', 'POST', 'DELETE'].indexOf(this._method) !== -1;
  }
}
