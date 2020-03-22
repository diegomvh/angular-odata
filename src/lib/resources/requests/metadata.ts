import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { map } from 'rxjs/operators';
import { ODataClient } from '../../client';
import { $METADATA } from '../../types';
import { Parser } from '../../models';
import { ODataMetadata } from '../responses';
import { HttpOptions } from '../http-options';

export class ODataMetadataResource extends ODataResource<any> {

  static factory(service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parser?: Parser<any>}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.metadata, $METADATA);
    options.clear();
    return new ODataMetadataResource(service, segments, options, parser);
  }

  get(options?: HttpOptions): Observable<ODataMetadata> {
    return this.client.get(this, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'text',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }).pipe(map(body => new ODataMetadata(body)));
  }
}
