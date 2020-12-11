import { HttpHeaders, HttpParams } from '@angular/common/http';
import { ODataApi } from '../api';
import { ACCEPT, IF_MATCH_HEADER } from '../constants';
import { Http } from '../utils';
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

  constructor(init: {
    method: string,
    api: ODataApi,
    resource: ODataResource<T>,
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
    this.method = init.method;
    this.resource = init.resource;

    this.api = init.api;
    this.body = init.body;
    this.reportProgress = init.reportProgress;
    this.responseType = init.responseType;
    this.observe = init.observe;

    this.withCredentials = (init.withCredentials === undefined) ? this.api.options.withCredentials : init.withCredentials;
    this.fetchPolicy = init.fetchPolicy || this.api.options.fetchPolicy;

    // The Path and Params from resource
    const [resourcePath, resourceParams] = init.resource.pathAndParams();
    this.path = resourcePath;

    // Headers
    let customHeaders: {[name: string]: string | string[]} = {};
    if (typeof init.etag === 'string')
      customHeaders[IF_MATCH_HEADER] = init.etag;

    let accept = [];
    // Metadata ?
    if (this.api.options.metadata !== undefined)
      accept.push(`odata.metadata=${this.api.options.metadata}`);
    // IEEE754
    if (this.api.options.ieee754Compatible !== undefined)
      accept.push(`IEEE754Compatible=${this.api.options.ieee754Compatible}`);
    if (accept.length > 0)
      customHeaders[ACCEPT] = `application/json;${accept.join(';')}, text/plain, */*`;
    this.headers = Http.mergeHttpHeaders(this.api.options.headers, customHeaders, init.headers || {});

    // Params
    this.params = Http.mergeHttpParams(this.api.options.params, resourceParams, init.params || {});
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
