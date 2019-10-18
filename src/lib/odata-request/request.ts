import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataOptions } from './options';
import { ODataSegment, PlainObject } from './types';
import { ODataSegments } from './segments';
import { ODataClient, ODataObserve } from '../client';
import { Schema } from '../schema';

export abstract class ODataRequest<Type> {
  public static readonly QUERY_SEPARATOR = '?';

  // VARIABLES
  protected client: ODataClient;
  protected segments: ODataSegments;
  protected options: ODataOptions;
  schema: Schema<Type>;

  constructor(
    client: ODataClient,
    segments?: ODataSegments,
    options?: ODataOptions
  ) {
    this.client = client;
    this.segments = segments || new ODataSegments();
    this.options = options || new ODataOptions();
  }

  protected get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'text'|'json'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    return this.client.get(this, options as any);
  }

  protected post(body: Type|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'text'|'json'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    let schema = this.schema || new Schema<Type>();
    return this.client.post(this, schema.serialize(body), options as any);
  }

  protected patch(body: Partial<Type>|null, options: {
    etag?: string, 
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'text'|'json'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    let schema = this.schema || new Schema<Type>();
    return this.client.patch(this, schema.serialize(body), options as any);
  }

  protected put(body: Type|null, options: {
    etag?: string, 
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'text'|'json'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    let schema = this.schema || new Schema<Type>();
    return this.client.put(this, schema.serialize(body), options as any);
  }

  protected delete(options: {
    etag?: string, 
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'text'|'json'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    return this.client.delete(this, options as any);
  }

  path(): string {
    return this.segments.path();
  }

  params(): PlainObject {
    return this.options.params();
  }

  toString(): string {
    let path = this.path();
    let queryString = Object.entries(this.params())
      .map(e => `${e[0]}${ODataOptions.VALUE_SEPARATOR}${e[1]}`)
      .join(ODataOptions.PARAM_SEPARATOR);
    return queryString ? `${path}${ODataRequest.QUERY_SEPARATOR}${queryString}` : path
  }

  clone<T>(
    type?: { new(client: ODataClient, segments: ODataSegments, options: ODataOptions): ODataRequest<T>; }
  ): ODataRequest<T> {
    if (!type) 
      type = this.constructor as { new(service: ODataClient, segments: ODataSegments, options: ODataOptions): ODataRequest<T>; };
    return new type(this.client, this.segments.clone(), this.options.clone()) as ODataRequest<T>;
  };

  toJSON() {
    return {
      segments: this.segments.toJSON(),
      params: this.options.toJSON()
    }
  }

  static fromJSON<T>(
    client: ODataClient, 
    json: {segments: any[], options: PlainObject},
    type?: { new(service: ODataClient, segments?: ODataSegment[], options?: PlainObject): ODataRequest<T>; }
  ): ODataRequest<T> {
    if (!type) 
      type = this.constructor as { new(service: ODataClient, segments?: ODataSegment[], options?: PlainObject): ODataRequest<T>; };
    return new type(client, json.segments, json.options) as ODataRequest<T>;
  }

  is(type: string) {
    return this.segments.last().type === type;
  }
}

