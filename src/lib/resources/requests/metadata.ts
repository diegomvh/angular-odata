import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, SegmentNames } from '../path-segments';
import { map } from 'rxjs/operators';
import { ODataClient } from '../../client';
import { ODataMetadata } from '../responses';
import { $METADATA } from '../../types';
import { HttpOptions } from '../http-options';

export class ODataMetadataResource extends ODataResource<any> {

  static factory(client: ODataClient) {
    let segments = new ODataPathSegments();
    segments.segment(SegmentNames.metadata, $METADATA);
    return new ODataMetadataResource(client, segments);
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
