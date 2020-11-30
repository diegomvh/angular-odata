import { HttpHeaders, HttpParams } from '@angular/common/http';
import { ODataOptions } from '../options';
import { ODataApi } from '../api';
import { ACCEPT, IF_MATCH_HEADER } from '../constants';
import { Http, Types } from '../utils';
import { ODataResource } from './resource';

export class ODataRequest<T> {
  readonly method: string;
  readonly api: ODataApi;
  readonly body: T | null;
  readonly observe?: 'events' | 'response'
  readonly reportProgress?: boolean;
  readonly withCredentials?: boolean;
  readonly responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
  readonly fetchPolicy: 'cache-first' | 'cache-and-network' | 'network-only' | 'no-cache' | 'cache-only';
  readonly headers: HttpHeaders;
  readonly params: HttpParams;
  readonly path: string;
  readonly resource: ODataResource<T>;

  constructor(method: string, resource: ODataResource<T>, init: {
    api: ODataApi,
    body: T | null,
    observe?: 'events' | 'response',
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'no-cache' | 'cache-only',
    withCredentials?: boolean
  }) {
    this.method = method;
    this.resource = resource;

    this.api = init.api;
    this.body = init.body;
    this.reportProgress = init.reportProgress;
    this.responseType = init.responseType;
    this.observe = init.observe;

    this.withCredentials = (init.withCredentials === undefined) ? this.options.withCredentials : init.withCredentials;
    this.fetchPolicy = init.fetchPolicy || this.options.fetchPolicy;

    // The Path and Params from resource
    const [resourcePath, resourceParams] = resource.pathAndParams();
    this.path = resourcePath;

    // Headers
    let customHeaders: {[name: string]: string | string[]} = {};
    if (typeof init.etag === 'string')
      customHeaders[IF_MATCH_HEADER] = init.etag;

    let accept = [];
    // Metadata ?
    if (!Types.isUndefined(this.options.metadata))
      accept.push(`odata.metadata=${this.options.metadata}`);
    // IEEE754
    if (!Types.isUndefined(this.options.ieee754Compatible))
      accept.push(`IEEE754Compatible=${this.options.ieee754Compatible}`);
    if (accept.length > 0)
      customHeaders[ACCEPT] = `application/json;${accept.join(';')}, text/plain, */*`;
    this.headers = Http.mergeHttpHeaders(this.options.headers, customHeaders, init.headers || {});

    // Params
    this.params = Http.mergeHttpParams(this.options.params, resourceParams, init.params || {});
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

  get options(): ODataOptions {
    return this.api.options.clone();
  }
}
