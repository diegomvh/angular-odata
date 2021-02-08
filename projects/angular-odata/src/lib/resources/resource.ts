import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  VALUE_SEPARATOR,
  PARAM_SEPARATOR,
  QUERY_SEPARATOR
} from '../constants';
import { Http, Urls } from '../utils/index';

import { PlainObject } from './builder';
import { ODataPathSegments } from './path-segments';
import {
  ODataQueryOptions
} from './query-options';
import { HttpOptions } from './types';
import { ODataResponse } from './responses/index';
import { ODataApi } from '../api';
import { Parser } from '../types';
import { ODataRequest } from './request';
import { ODataStructuredTypeParser } from '../parsers';

export abstract class ODataResource<T> {
  // VARIABLES
  public api: ODataApi;
  protected pathSegments: ODataPathSegments;
  protected queryOptions: ODataQueryOptions;

  constructor(
    api: ODataApi,
    segments?: ODataPathSegments,
    options?: ODataQueryOptions
  ) {
    this.api = api;
    this.pathSegments = segments || new ODataPathSegments();
    this.queryOptions = options || new ODataQueryOptions();
  }

  /**
   * @returns string The type of the resource
   */
  type() {
    return this.pathSegments.last()?.type();
  }

  /**
   * @returns string All covered types of the resource
   */
  types(): string[] {
    return this.pathSegments.types();
  }

  isSubtypeOf(other: ODataResource<any>) {
    const api = this.api;
    const self = this.type();
    const that = other.type();
    if (self !== undefined && that !== undefined) {
      const thatParser = api.findParserForType<T>(that) as ODataStructuredTypeParser<T>;
      return thatParser.findParser(c => c.isTypeOf(self)) !== undefined;
    }
    return false;
  }

  pathAndParams(): [string, PlainObject] {
    let path = this.pathSegments.path();
    let params = this.queryOptions.params();
    if (path.indexOf(QUERY_SEPARATOR) !== -1) {
      let parts = path.split(QUERY_SEPARATOR);
      path = parts[0];
      Object.assign(params, Urls.parseQueryString(parts[1]));
    }
    return [path, params];
  }

  endpointUrl() {
    return `${this.api.serviceRootUrl}${this}`;
  }

  toString(): string {
    let [path, params] = this.pathAndParams();
    let queryString = Object.entries(params)
      .map(e => `${e[0]}${VALUE_SEPARATOR}${e[1]}`)
      .join(PARAM_SEPARATOR);
    return queryString ? `${path}${QUERY_SEPARATOR}${queryString}` : path;
  }

  abstract clone(): ODataResource<T>;

  serialize(value: any): any {
    let api = this.api;
    let type = this.type();
    if (type !== undefined) {
      let parser = api.findParserForType<T>(type);
      if (parser !== undefined && 'serialize' in parser) {
        return Array.isArray(value) ?
          value.map(e => (parser as Parser<T>).serialize(e, api.options)) :
          parser.serialize(value, api.options);
      }
    }
    return value;
  }

  toJSON() {
    return {
      segments: this.pathSegments.toJSON(),
      options: this.queryOptions.toJSON()
    };
  }

  alias(name: string, value?: any) {
    return this.queryOptions.alias(name, value);
  }

  // Base Requests
  protected request(
    method: string,
    options: HttpOptions & {
      attrs?: any,
      etag?: string,
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'property' | 'entity' | 'entities',
      withCount?: boolean
    }): Observable<any> {

    //let api = options.apiName ? this.client.apiByName(options.apiName) : this.api;
    const copts = this.api.options;
    let params = options.params || {};
    if (options.withCount) {
      params = Http.mergeHttpParams(params, copts.helper.countParam());
    }

    let responseType: 'arraybuffer' | 'blob' | 'json' | 'text' =
      (options.responseType && ['property', 'entity', 'entities'].indexOf(options.responseType) !== -1) ?
        'json' :
      (options.responseType === 'value') ?
        'text' :
        <'arraybuffer' | 'blob' | 'json' | 'text'>options.responseType;

    let body = options.attrs !== undefined ? this.serialize(options.attrs) : null;

    let etag = options.etag;
    if (etag === undefined && options.attrs != null) {
      etag = copts.helper.etag(options.attrs);
    }

    const request = new ODataRequest({
      method,
      body,
      etag,
      api: this.api,
      resource: this,
      observe: 'response',
      headers: options.headers,
      reportProgress: options.reportProgress,
      params: params,
      responseType: responseType,
      fetchPolicy: options.fetchPolicy,
      withCredentials: options.withCredentials
    });

    const res$ = this.api.request(request);
    switch (options.responseType) {
      case 'entities':
        return res$.pipe(map((res: ODataResponse<T>) => res.entities()));
      case 'entity':
        return res$.pipe(map((res: ODataResponse<T>) => res.entity()));
      case 'property':
        return res$.pipe(map((res: ODataResponse<T>) => res.property()));
      case 'value':
        return res$.pipe(map((res: ODataResponse<T>) => res.value() as T));
      default:
        // Other responseTypes (arraybuffer, blob, json, text) return body
        return res$.pipe(map((res: ODataResponse<T>) => res.body));
    }
  }

  protected get(options: HttpOptions & {
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  } = {}): Observable<any> {
    return this.request('GET', options);
  }

  protected post(attrs: any, options: HttpOptions & {
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  } = {}): Observable<any> {
    return this.request('POST', Object.assign(options, { attrs }));
  }

  protected put(attrs: any, options: HttpOptions & {
    etag?: string,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  } = {}): Observable<any> {
    return this.request('PUT', Object.assign(options, { attrs }));
  }

  protected patch(attrs: any, options: HttpOptions & {
    etag?: string,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  } = {}): Observable<any> {
    return this.request('PATCH', Object.assign(options, { attrs }));
  }

  protected delete(options: HttpOptions & {
    etag?: string,
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  } = {}): Observable<any> {
    return this.request('DELETE', options);
  }
}
