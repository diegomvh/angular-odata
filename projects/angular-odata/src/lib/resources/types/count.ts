import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataResource } from '../resource';
import { HttpOptions } from './options';
import { $COUNT } from '../../constants';
import { ODataApi } from '../../api';

export class ODataCountResource extends ODataResource<any> {
  //#region Factory
  static factory(api: ODataApi, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.add(PathSegmentNames.count, $COUNT).type('Edm.Int32');
    options.keep(QueryOptionNames.filter, QueryOptionNames.search);
    return new ODataCountResource(api, segments, options);
  }

  get segment() {
    const segments = this.pathSegments;
    return {
      entitySet() {
        return segments.get(PathSegmentNames.entitySet);
      },
      navigationProperty() {
        return segments.get(PathSegmentNames.navigationProperty);
      }
    }
  }

  clone() {
    return new ODataCountResource(this.api, this.pathSegments.clone(), this.queryOptions.clone());
  }
  //#endregion

  //#region Requests
  fetch(options?: HttpOptions): Observable<number> {
    return super.get(
      Object.assign<HttpOptions, HttpOptions>(<HttpOptions>{responseType: 'value'}, options || {})
    );
  }
  //#endregion
}
