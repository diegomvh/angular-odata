import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataOptions } from './options';
import { ODataSegment, PlainObject } from './types';
import { ODataSegments } from './segments';
import { ODataClient, ODataObserve } from '../client';

export abstract class ODataRequest {
  public static readonly QUERY_SEPARATOR = '?';

  // VARIABLES
  protected client: ODataClient;
  protected segments: ODataSegments;
  protected options: ODataOptions;

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

  protected post(body: any|null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'text'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    return this.client.post(this, body, options as any);
  }

  protected patch(body: any|null, etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'text'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    return this.client.patch(this, body, etag, options as any);
  }

  protected put(body: any|null, etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'text'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    return this.client.put(this, body, etag, options as any);
  }

  protected delete (etag?: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: ODataObserve,
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'text'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    return this.client.delete(this, etag, options as any);
  }

  toString(): string {
    let path = this.path();
    let queryString = Object.entries(this.params())
      .map(e => `${e[0]}${ODataOptions.VALUE_SEPARATOR}${e[1]}`)
      .join(ODataOptions.PARAM_SEPARATOR);
    return queryString ? `${path}${ODataRequest.QUERY_SEPARATOR}${queryString}` : path
  }

  path(): string {
    return this.segments.path();
  }

  params(): PlainObject {
    return this.options.params();
  }

  clone<T extends ODataRequest>(type?: { new(client: ODataClient, segments: ODataSegments, options: ODataOptions): T; }): T {
    if (!type) 
      type = this.constructor as { new(service: ODataClient, segments: ODataSegments, options: ODataOptions): T; };
    return new type(this.client, this.segments.clone(), this.options.clone());
  };

  toJSON() {
    return {
      segments: this.segments.toJSON(),
      params: this.options.toJSON()
    }
  }

  static fromJSON<T extends ODataRequest>(
    client: ODataClient, 
    json: {segments: any[], options: PlainObject},
    type?: { new(service: ODataClient, segments?: ODataSegment[], options?: PlainObject): T; }): T {
    if (!type) 
      type = this.constructor as { new(service: ODataClient, segments?: ODataSegment[], options?: PlainObject): T; };
    return new type(client, json.segments, json.options);
  }

  is(type: string) {
    return this.segments.last().type === type;
  }
}

