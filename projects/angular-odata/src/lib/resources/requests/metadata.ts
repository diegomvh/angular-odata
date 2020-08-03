import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { map } from 'rxjs/operators';
import { ODataClient } from '../../client';
import { $METADATA } from '../../types';
import { HttpOptions } from './options';
import { ODataMetadata } from '../responses/index';

export class ODataMetadataResource extends ODataResource<any> {
  //#region Factory
  static factory(client: ODataClient) {
    let segments = new ODataPathSegments();
    segments.segment(PathSegmentNames.metadata, $METADATA);
    return new ODataMetadataResource(client, segments);
  }

  clone() {
    return super.clone<ODataMetadataResource>();
  }
  //#endregion

  //#region Requests
  get(options?: HttpOptions): Observable<ODataMetadata> {
    let opts = Object.assign<any, HttpOptions>({ observe: 'body', responseType: 'text' }, options || {});
    return this.client.get(this, opts).pipe(map((body: any) => new ODataMetadata(body)));
  }
  //#endregion
}
