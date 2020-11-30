import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  VALUE_SEPARATOR,
  PARAM_SEPARATOR,
  QUERY_SEPARATOR
} from '../constants';
import { ODataClient } from '../client';
import { Http, Types } from '../utils';

import { PlainObject } from './builder';
import { ODataPathSegments } from './path-segments';
import {
  ODataQueryOptions
} from './query-options';
import { HttpOptions } from './types';
import {
  ODataModel,
  ODataCollection
} from '../models';
import { ODataResponse, ODataEntityMeta, ODataEntitiesMeta } from './responses';
import { Urls } from '../utils';
import { ODataApi } from '../api';
import { Parser } from '../types';

export abstract class ODataResource<Type> {
  // VARIABLES
  protected client: ODataClient;
  protected pathSegments: ODataPathSegments;
  protected queryOptions: ODataQueryOptions;

  constructor(
    client: ODataClient,
    segments?: ODataPathSegments,
    options?: ODataQueryOptions
  ) {
    this.client = client;
    this.pathSegments = segments || new ODataPathSegments();
    this.queryOptions = options || new ODataQueryOptions();
  }
  /**
   * @returns string The type of the resource
   */
  type() {
    let segment = this.pathSegments.last();
    return segment ? segment.type : null;
  }
  /**
   * @returns string All covered types of the resource
   */
  types(): string[] {
    return this.pathSegments.types();
  }

  //#region Api Config
  get api(): ODataApi {
    return this.client
      .apiFor(this);
  }
  ////#endregion

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

  protected serialize(value: any): any {
    let config = this.api;
    let type = this.type();
    if (type !== null) {
      let parser = config.parserForType<Type>(type);
      if (parser !== null && 'serialize' in parser) {
        return Array.isArray(value) ?
          value.map(e => (parser as Parser<Type>).serialize(e, config.options)) :
          parser.serialize(value, config.options);
      }
    }
    return value;
  }

  asModel<M extends ODataModel<Type>>(entity: Partial<Type>, meta?: ODataEntityMeta): M {
    let Model = ODataModel;
    let type = this.type();
    if (type !== null) {
      Model = this.client.modelForType(type);
    }
    return new Model(entity, {resource: this, meta}) as M;
  }

  asCollection<C extends ODataCollection<Type, ODataModel<Type>>>(entities: Partial<Type>[], meta?: ODataEntitiesMeta): C {
    let Collection = ODataCollection;
    let type = this.type();
    if (type !== null) {
      Collection = this.client.collectionForType(type);
    }
    return new Collection(entities, {resource: this, meta}) as C;
  }

  // Testing
  toString(): string {
    let [path, params] = this.pathAndParams();
    let queryString = Object.entries(params)
      .map(e => `${e[0]}${VALUE_SEPARATOR}${e[1]}`)
      .join(PARAM_SEPARATOR);
    return queryString ? `${path}${QUERY_SEPARATOR}${queryString}` : path;
  }

  abstract clone(): ODataResource<Type>;

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
      responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
      withCount?: boolean
    }): Observable<any> {

    const config = this.api;
    const copts = config.options;
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

    let body = null;
    if (!Types.isNullOrUndefined(options.attrs)) {
      body = this.serialize(options.attrs);
    }
    let etag = options.etag;
    if (Types.isNullOrUndefined(etag) && !Types.isNullOrUndefined(options.attrs)) {
      etag = copts.helper.etag(options.attrs);
    }
    const res$ = this.client.request(method, this, {
      body,
      etag,
      apiName: options.apiName,
      headers: options.headers,
      observe: 'response',
      params: params,
      responseType: responseType,
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
    switch (options.responseType) {
      case 'entities':
        return res$.pipe(map((res: ODataResponse<Type>) => res.entities()));
      case 'entity':
        return res$.pipe(map((res: ODataResponse<Type>) => res.entity()));
      case 'property':
        return res$.pipe(map((res: ODataResponse<Type>) => res.property()));
      case 'value':
        return res$.pipe(map((res: ODataResponse<Type>) => res.value() as Type));
      default:
        return res$.pipe(map((res: ODataResponse<Type>) => res.body));
    }
  }

  protected get(options: HttpOptions & {
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  }): Observable<any> {
    return this.request('GET', options);
  }

  protected post(attrs: any, options: HttpOptions & {
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  }): Observable<any> {
    return this.request('POST', Object.assign(options, { attrs }));
  }

  protected put(attrs: any, options: HttpOptions & {
    etag?: string,
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  }): Observable<any> {
    return this.request('PUT', Object.assign(options, { attrs }));
  }

  protected patch(attrs: any, options: HttpOptions & {
    etag?: string,
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  }): Observable<any> {
    return this.request('PATCH', Object.assign(options, { attrs }));
  }

  protected delete(options: HttpOptions & {
    etag?: string,
    responseType?: 'arraybuffer' | 'blob' | 'value' | 'property' | 'entity' | 'entities',
    withCount?: boolean
  }): Observable<any> {
    return this.request('DELETE', options);
  }
}
