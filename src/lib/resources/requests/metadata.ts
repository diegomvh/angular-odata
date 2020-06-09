import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, SegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { map } from 'rxjs/operators';
import { ODataClient } from '../../client';
import { $METADATA, Parser } from '../../types';
import { ODataMetadata } from '../responses';
import { HttpOptions } from '../http-options';

export class ODataMetadataResource extends ODataResource<any> {

  static factory(service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();

    segments.segment(SegmentNames.metadata, $METADATA);
    options.clear();
    return new ODataMetadataResource(service, segments, options);
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
