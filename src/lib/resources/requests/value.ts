import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataClient } from '../../client';
import { $VALUE } from '../../types';
import { Parser } from '../../models';
import { map } from 'rxjs/operators';
import { HttpOptions } from '../http-options';

export class ODataValueResource<T> extends ODataResource<T> {
  // Factory
  static factory<V>(service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parser?: Parser<V>}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.value, $VALUE);
    options.clear();
    return new ODataValueResource<V>(service, segments, options, parser);
  }

  get(options?: HttpOptions): Observable<T> {
    return this.client.get<T>(this, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => this.deserialize(body) as T));
  }
}
