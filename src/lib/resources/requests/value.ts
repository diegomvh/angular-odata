import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataClient } from '../../client';
import { $VALUE, Parser } from '../../types';
import { HttpOptions } from '../http-options';
import { ODataEntityParser } from '../../parsers';

export class ODataValueResource<T> extends ODataResource<T> {
  // Factory
  static factory<V>(service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();

    segments.segment(SegmentTypes.value, $VALUE);
    options.clear();
    return new ODataValueResource<V>(service, segments, options);
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

  get(options?: HttpOptions): Observable<T> {
    return super.get( 
      (this.parser instanceof ODataEntityParser) ?
        Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'json'}, options || {}) :
        Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'text'}, options || {})
      );
  }
}
