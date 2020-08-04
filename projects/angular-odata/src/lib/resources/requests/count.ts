import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataResource } from '../resource';
import { ODataClient } from '../../client';
import { HttpOptions } from './options';
import { $COUNT } from '../../constants';

export class ODataCountResource extends ODataResource<any> {
  //#region Factory
  static factory(client: ODataClient, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.count, $COUNT).setType('Edm.Int32');
    options.keep(QueryOptionNames.filter, QueryOptionNames.search);
    return new ODataCountResource(client, segments, options);
  }

  clone() {
    return super.clone<ODataCountResource>();
  }
  //#endregion

  //#region Requests
  get(options?: HttpOptions): Observable<number> {
    return super.get(
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'value'}, options || {})
    );
  }
  //#endregion
}
