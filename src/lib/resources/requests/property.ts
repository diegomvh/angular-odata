import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataValueResource } from './value';

import { ODataResource } from '../resource';
import { ODataOptions } from '../options';
import { ODataSegments, Segments } from '../segments';
import { ODataClient } from '../../client';
import { Parser } from '../../models';
import { map } from 'rxjs/operators';
import { ODataAnnotations } from '../responses/annotations';

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

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<[T, ODataAnnotations]> {
    return this.client.get<T>(this, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.fromValueBody(body)));
  }
}
