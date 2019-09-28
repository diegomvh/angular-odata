import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataOptions } from './options';
import { ODataSegment, PlainObject } from './types';
import { ODataSegments } from './segments';
import { ODataClient } from '../client';

export type ODataObserve = 'body' | 'events' | 'response';

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
    responseType?: 'text'|'entity'|'entityset'|'property',
    withCredentials?: boolean,
    withCount?: boolean
  } = {}): Observable<any> {
    return this.client.request("GET", this, options);
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
    return this.client.request("POST", this, Object.assign(options, {body}));
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
    return this.client.request("PATCH", this, Object.assign(options, {body, etag}));
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
    return this.client.request("PUT", this, Object.assign(options, {body, etag}));
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
    return this.client.request("DELETE", this, Object.assign(options, {etag}));
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

  clone<T extends ODataRequest>(type?: { new(service: ODataClient, segments: ODataSegments, options: ODataOptions): T; }): T {
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
    service: ODataClient, 
    json: {segments: any[], options: PlainObject},
    type?: { new(service: ODataClient, segments?: ODataSegment[], options?: PlainObject): T; }): T {
    if (!type) 
      type = this.constructor as { new(service: ODataClient, segments?: ODataSegment[], options?: PlainObject): T; };
    return new type(service, json.segments, json.options);
  }

  is(type: string) {
    return this.segments.last().type === type;
  }
}

