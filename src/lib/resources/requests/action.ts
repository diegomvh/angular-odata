import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataSegments, Segments } from '../segments';
import { ODataOptions } from '../options';
import { ODataClient } from '../../client';
import { Parser } from '../../models';
import { ODataCallableResource } from './callable';
import { ODataEntityAnnotations, ODataCollectionAnnotations, ODataPropertyAnnotations } from '../responses/annotations';
import { map } from 'rxjs/operators';
import { $COUNT } from '../../types';

export class ODataActionResource<T> extends ODataCallableResource<T> {
  // Factory
  static factory<R>(name: string, client: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      parser?: Parser<R>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || null;

    segments.segment(Segments.actionCall, name);
    options.clear();
    return new ODataActionResource<R>(client, segments, options, parser);
  }

  //POST
  post(body: any | null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entity',
    withCredentials?: boolean
  }): Observable<[T, ODataEntityAnnotations]>;

  post(body: any | null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entities',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<[T[], ODataCollectionAnnotations]>;

  post(body: any | null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean
  }): Observable<[T, ODataPropertyAnnotations]>;

  post(body: any | null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'entity'|'entities'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {

    let params = options && options.params;
    if (options && options.withCount)
      params = this.client.mergeHttpParams(params, {[$COUNT]: 'true'})

    let res$ = this.client.post(this, body, {
      headers: options && options.headers,
      observe: 'body',
      params: params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
    if (options && options.responseType) {
      switch (options.responseType) {
        case 'entity':
          return res$.pipe(map((body: any) => this.toEntity(body)));
        case 'entities':
          return res$.pipe(map((body: any) => this.toEntities(body)));
        case 'property':
          return res$.pipe(map((body: any) => this.toValue(body)));
      }
    }
    return res$;
  }

}
