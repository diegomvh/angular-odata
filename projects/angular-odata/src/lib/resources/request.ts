import { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
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
import { FetchPolicy, ParserOptions, QueryOption } from '../types';
import { Http, Types } from '../utils';
import { ODataResource } from './resource';
import { ODataOptions } from './types';

export class ODataRequest<T> {
  readonly api: ODataApi;
  readonly observe: 'events' | 'response';
  readonly context?: HttpContext;
  readonly reportProgress?: boolean;
  readonly withCredentials?: boolean;
  readonly bodyQueryOptions: QueryOption[];
  readonly fetchPolicy:
    | 'cache-first'
    | 'cache-and-network'
    | 'network-only'
    | 'no-cache'
    | 'cache-only';
  readonly resource: ODataResource<T>;
  private readonly _responseType?:
    | 'arraybuffer'
    | 'blob'
    | 'json'
    | 'text'
    | 'value'
    | 'property'
    | 'entity'
    | 'entities';
  private readonly _method: string;
  private readonly _body: any | null;
  private readonly _headers: HttpHeaders;
  private readonly _params: HttpParams;
  private readonly _path: string;

  constructor(init: {
    method: string;
    api: ODataApi;
    resource: ODataResource<T>;
    body: any;
    observe: 'events' | 'response';
    context?: HttpContext;
    etag?: string;
    headers?: HttpHeaders | { [header: string]: string | string[] };
    reportProgress?: boolean;
    params?:
    | HttpParams
    | {
      [param: string]:
      | string
      | number
      | boolean
      | ReadonlyArray<string | number | boolean>;
    };
    responseType?:
    | 'arraybuffer'
    | 'blob'
    | 'json'
    | 'text'
    | 'value'
    | 'property'
    | 'entity'
    | 'entities';
    fetchPolicy?: FetchPolicy;
    parserOptions?: ParserOptions;
    withCredentials?: boolean;
    bodyQueryOptions?: QueryOption[];
  }) {
    this._method = init.method;
    this.resource = init.resource;

    this.api = init.api;
    this.reportProgress = init.reportProgress;
    this.observe = init.observe;
    this.context = init.context;

    // Response Type
    this._responseType = init.responseType;

    // The Body
    this._body = init.body !== undefined ? init.body : null;
    if (this._body !== null) this._body = this.resource.serialize(this._body, init.parserOptions);

    this.withCredentials =
      init.withCredentials === undefined
        ? this.api.options.withCredentials
        : init.withCredentials;
    this.fetchPolicy = init.fetchPolicy || this.api.options.fetchPolicy;
    this.bodyQueryOptions = [
      ...(this.api.options.bodyQueryOptions || []),
      ...(init.bodyQueryOptions || []),
    ];

    // The Path and Params from resource
    const [resourcePath, resourceParams] = this.resource.pathAndParams(init.parserOptions);
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
    // Metadata
    if (this.api.options.accept?.metadata !== undefined)
      accept.push(`odata.metadata=${this.api.options.accept?.metadata}`);
    // IEEE754
    if (this.api.options.accept?.ieee754Compatible !== undefined)
      accept.push(
        `IEEE754Compatible=${this.api.options.accept?.ieee754Compatible}`,
      );
    // streaming
    if (this.api.options.accept?.streaming !== undefined)
      accept.push(`streaming=${this.api.options.accept?.streaming}`);
    // ExponentialDecimals
    if (this.api.options.accept?.exponentialDecimals !== undefined)
      accept.push(
        `ExponentialDecimals=${this.api.options.accept?.exponentialDecimals}`,
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
        `odata.include-annotations=${this.api.options.prefer?.includeAnnotations}`,
      );
    // Omit Null Values
    if (
      this.api.options.prefer?.omitNullValues === true &&
      ['GET'].indexOf(this._method) !== -1
    )
      prefer.push(`omit-values=nulls`);
    // Continue on Error
    if (
      this.api.options.prefer?.continueOnError === true &&
      ['POST'].indexOf(this._method) !== -1
    )
      prefer.push(`odata.continue-on-error`);
    if (prefer.length > 0) customHeaders[PREFER] = prefer;
    this._headers = Http.mergeHttpHeaders(
      this.api.options.headers,
      customHeaders,
      init.headers || {},
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

    const params = Http.mergeHttpParams(
      this.api.options.params,
      customParams,
      init.params || {},
    );

    this._params =
      this._responseType === 'entity'
        ? Http.withoutHttpParams(params, [
          '$filter',
          '$orderby',
          '$count',
          '$skip',
          '$top',
        ])
        : params;
    //#endregion
  }

  static factory(
    api: ODataApi,
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body?: any;
      etag?: string;
      responseType?:
      | 'arraybuffer'
      | 'blob'
      | 'json'
      | 'text'
      | 'value'
      | 'property'
      | 'entity'
      | 'entities';
      observe: 'events' | 'response';
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ) {
    const apiOptions = api.options;
    let params = options.params || {};
    if (options.withCount) {
      params = Http.mergeHttpParams(params, apiOptions.helper.countParam());
    }

    let etag = options.etag;
    if (etag === undefined && Types.isPlainObject(options.body)) {
      etag = apiOptions.helper.etag(options.body);
    }

    return new ODataRequest({
      method,
      etag,
      api,
      resource,
      params,
      context: options.context,
      body: options.body,
      observe: options.observe,
      headers: options.headers,
      reportProgress: options.reportProgress,
      responseType: options.responseType,
      fetchPolicy: options.fetchPolicy,
      parserOptions: options.parserOptions,
      withCredentials: options.withCredentials,
      bodyQueryOptions: options.bodyQueryOptions,
    });
  }

  get responseType(): 'arraybuffer' | 'blob' | 'json' | 'text' {
    return this._responseType &&
      ['property', 'entity', 'entities'].indexOf(this._responseType) !== -1
      ? 'json'
      : this._responseType === 'value'
        ? 'text'
        : <'arraybuffer' | 'blob' | 'json' | 'text'>this._responseType;
  }

  get path() {
    return this.isQueryBody() ? `${this._path}/${$QUERY}` : this._path;
  }

  get method() {
    return this.isQueryBody() ? 'POST' : this._method;
  }

  get body() {
    return this.isQueryBody()
      ? Http.splitHttpParams(
        this._params,
        this.bodyQueryOptions.map((name) => `$${name}`),
      )[1].toString()
      : this._body;
  }

  get params() {
    return this.isQueryBody()
      ? Http.splitHttpParams(
        this._params,
        this.bodyQueryOptions.map((name) => `$${name}`),
      )[0]
      : this._params;
  }

  get headers() {
    return this.isQueryBody()
      ? Http.mergeHttpHeaders(this._headers, { CONTENT_TYPE: TEXT_PLAIN })
      : this._headers;
  }

  get pathWithParams() {
    return this.params.keys().length > 0
      ? `${this.path}?${this.params}`
      : this.path;
  }

  get url() {
    return `${this.api.serviceRootUrl}${this.path}`;
  }

  get urlWithParams() {
    return `${this.api.serviceRootUrl}${this.pathWithParams}`;
  }

  get cacheKey() {
    return this._params.keys().length > 0
      ? `${this._path}?${this._params}`
      : this._path;
  }

  isQueryBody() {
    return (
      this._method === 'GET' &&
      this.bodyQueryOptions.length > 0 &&
      this.bodyQueryOptions.some((name) => this._params.has(`$${name}`))
    );
  }

  isBatch() {
    return this.path.endsWith($BATCH);
  }

  isFetch() {
    return ['GET'].indexOf(this._method) !== -1;
  }

  isMutate() {
    return ['PUT', 'PATCH', 'POST', 'DELETE'].indexOf(this._method) !== -1;
  }
}
