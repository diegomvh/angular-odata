import { HttpHeaders, HttpParams } from '@angular/common/http';
import { ODataResource } from '../resource';
import { ODataApiConfig, ODataOptions } from '../../configs';
import { ACCEPT, IF_MATCH_HEADER } from '../../constants';
import { Http, Types } from '../../utils';

export class ODataRequest<T> {
  readonly body: T | null = null;
  readonly headers!: HttpHeaders;
  readonly reportProgress: boolean = false;
  readonly withCredentials: boolean = false;
  readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' = 'json';
  readonly method: string;
  readonly params!: HttpParams;
  readonly path: string;
  readonly config: ODataApiConfig;
  readonly resource: ODataResource<T>;

  constructor(method: string, resource: ODataResource<T>, init: {
    config: ODataApiConfig,
    body?: T | null;
    etag?: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    reportProgress?: boolean,
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    withCredentials?: boolean,
  }) {
    this.method = method;
    this.resource = resource;
    this.config = init.config;

    // The Path and Params from resource
    const [resourcePath, resourceParams] = resource.pathAndParams();
    this.path = resourcePath;

    // Headers
    let customHeaders = {};
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
    this.headers = Http.mergeHttpHeaders(this.config.headers, customHeaders, init.headers);

    // Params
    this.params = Http.mergeHttpParams(this.config.params, resourceParams, init.params);

    // Credentials ?
    let withCredentials = init.withCredentials;
    if (Types.isUndefined(withCredentials))
      withCredentials = init.withCredentials;
    this.reportProgress = !!init.reportProgress;
    this.withCredentials = !!init.withCredentials;

    // Override default response type of 'json' if one is provided.
    if (!!init.responseType) {
      this.responseType = init.responseType;
    } 
  }

  get url() {
    return `${this.config.serviceRootUrl}${this.path}`;
  }

  get urlWithParams() {
    let url = this.url;
    if (this.params.keys().length > 0) {
      url = `${url}?${this.params}`;
    }
    return url;
  }

  get pathWithParams() {
    let path = this.path;
    if (this.params.keys().length > 0) {
      path = `${path}?${this.params}`;
    }
    return path;
  }

  get options(): ODataOptions {
    return this.config.options.clone();
  }
}