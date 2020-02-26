import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { map } from 'rxjs/operators';
import { $COUNT, EntityKey } from '../../types';
import { ODataEntityAnnotations, ODataCollectionAnnotations, ODataPropertyAnnotations, ODataAnnotations } from '../responses';
import { Types } from '../../utils';

export class ODataCallableResource<T> extends ODataResource<T> {
  // Segments
  entity(key?: EntityKey<T>, annots?: ODataAnnotations) {
    if (annots instanceof ODataCollectionAnnotations) {
      return this.client.entitySet(annots.entitySet, this.type()).entity(key);
    }
  }

  //POST
  post(body: any | null, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entity',
    withCredentials?: boolean,
  }): Observable<[T, ODataEntityAnnotations]>;

  post(body?: any | null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entities',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<[T[], ODataCollectionAnnotations]>;

  post(body?: any | null, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<[T, ODataPropertyAnnotations]>;

  post(body?: any | null, options?: {
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

  //GET
  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entity',
    withCredentials?: boolean,
  }): Observable<[T, ODataEntityAnnotations]>;

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'entities',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<[T[], ODataCollectionAnnotations]>;

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'property',
    withCredentials?: boolean,
  }): Observable<[T, ODataPropertyAnnotations]>;

  get(options?: {
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

    let res$ = this.client.get<T>(this,{
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