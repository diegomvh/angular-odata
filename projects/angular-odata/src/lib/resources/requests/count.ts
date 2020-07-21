import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataResource } from '../resource';
import { ODataClient } from '../../client';
import { $COUNT } from '../../types';
import { HttpOptions } from '../http-options';

export class ODataCountResource extends ODataResource<any> {
  //#region Factory
  static factory(client: ODataClient, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.count, $COUNT).setType('number');
    options.keep(QueryOptionNames.filter, QueryOptionNames.search);
    return new ODataCountResource(client, segments, options);
  }
  //#endregion

  //#region Requests
  get(options?: HttpOptions): Observable<number> {
    return super.get(
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'json'}, options || {})
    );
  }
  //#endregion
}
