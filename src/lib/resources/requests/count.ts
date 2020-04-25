import { Observable } from 'rxjs';

import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataQueryOptions, QueryOptionTypes } from '../query-options';
import { ODataResource } from '../resource';
import { ODataClient } from '../../client';
import { $COUNT, Parser } from '../../types';
import { HttpOptions } from '../http-options';

export class ODataCountResource extends ODataResource<any> {
  // Factory
  static factory(service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parser?: Parser<any>}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.count, $COUNT);
    options.keep(QueryOptionTypes.filter, QueryOptionTypes.search);
    return new ODataCountResource(service, segments, options, parser);
  }

  get(options?: HttpOptions): Observable<number> {
    return super.get(
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'json'}, options || {})
    );
  }
}
