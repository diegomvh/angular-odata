import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataValueResource } from './value';

import { ODataResource } from '../resource';
import { ODataOptions } from '../options';
import { ODataSegments, Segments } from '../segments';
import { ODataClient } from '../../client';
import { Parser } from '../../models';
import { map } from 'rxjs/operators';
import { ODataPropertyAnnotations, ODataCollectionAnnotations } from '../responses';
import { EntityKey, $COUNT } from '../../types';

export class ODataPropertyResource<T> extends ODataResource<T> {

  // Factory
  static factory<P>(name: string, client: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      parser?: Parser<P>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || null;

    segments.segment(Segments.property, name);
    options.clear();
    return new ODataPropertyResource<P>(client, segments, options, parser);
  }

  entity(opts?: EntityKey<T>) {
    return this;
  }

  // Segments
  value() {
    return ODataValueResource.factory<T>(
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser
    });
  }

  property<P>(name: string) {
    return ODataPropertyResource.factory<P>(
      name,
      this.client, {
      segments: this.segments.clone(),
      options: this.options.clone(),
      parser: this.parser.parserFor<P>(name)
    });
  }

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'property',
    withCredentials?: boolean,
  }): Observable<[T, ODataPropertyAnnotations]>;

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    responseType: 'entities',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<[T[], ODataCollectionAnnotations]>;

  get(options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'property' | 'entities',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {

    let params = options && options.params;
    if (options && options.withCount)
      params = this.client.mergeHttpParams(params, {[$COUNT]: 'true'})

    let res$ = this.client.get<T>(this, {
      headers: options.headers,
      observe: 'body',
      params: params,
      responseType: 'json',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
    switch (options.responseType) {
      case 'property':
        return res$.pipe(map((body: any) => this.toValue(body)));
      case 'entities':
        return res$.pipe(map((body: any) => this.toEntities(body)));
    }
    return res$;
  }
}
