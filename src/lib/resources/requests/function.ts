import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataCollection } from '../responses/collection';
import { ODataSegments, Segments } from '../segments';
import { ODataOptions, Options } from '../options';
import { ODataClient } from '../../client';
import { PlainObject, $COUNT } from '../../types';
import { Schema, Parser } from '../../schema';
import { ODataValue } from '../responses';
import { map } from 'rxjs/operators';
import { ODataEntityResource } from './entity';

export class ODataFunctionResource<T> extends ODataResource<T> {

  // Factory
  static factory<R>(name: string, service: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      parser?: Parser<R>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || new Schema<R>();

    segments.segment(Segments.functionCall, name);
    options.keep(Options.format);
    return new ODataFunctionResource<R>(service, segments, options, parser);
  }

  deserialize(body: any): T {
    let query = ODataEntityResource.factory(this.client, {parser: this.parser});
    return this.parser.parse(body, query) as T;
  }

  // Parameters
  parameters(opts?: PlainObject) {
    return this.segments.last().option(Options.parameters, opts);
  }

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'entity',
    withCredentials?: boolean,
  }): Observable<T>;

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'entityset',
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<ODataCollection<T>>;

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType: 'property',
    withCredentials?: boolean,
  }): Observable<ODataValue<T>>;

  get(options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'entity'|'entityset'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {

    let params = options && options.params;
    if (options && options.withCount)
      params = this.client.mergeHttpParams(params, {[$COUNT]: 'true'})

    let res$ = this.client.get<T>(this,{
      headers: options.headers,
      observe: 'body',
      params: params,
      responseType: 'json',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
    switch (options.responseType) {
      case 'entity':
        return res$.pipe(map((body: any) => this.deserializeSingle(body)));
      case 'entityset':
        return res$.pipe(map((body: any) => this.deserializeCollection(body)));
      case 'property':
        return res$.pipe(map((body: any) => this.deserializeValue(body)));
    }
    return res$;
  }
}
