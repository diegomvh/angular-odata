import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataClient } from '../../client';
import { $VALUE, Parser } from '../../types';
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

  arraybuffer(options?: HttpOptions): Observable<ArrayBuffer> {
    return super.get( 
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'arraybuffer'}, options || {})
    );
  }

  blob(options?: HttpOptions): Observable<Blob> {
    return super.get( 
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'blob'}, options || {})
    );
  }

  text(options?: HttpOptions): Observable<string> {
    return super.get( 
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'text'}, options || {})
    );
  }

  get(options?: HttpOptions): Observable<T> {
    return super.get( 
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'json'}, options || {})
    );
  }
}
