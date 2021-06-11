import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataResource } from '../resource';
import { HttpOptions } from './options';
import { $COUNT } from '../../constants';
import { ODataApi } from '../../api';

export class ODataCountResource extends ODataResource<any> {
  //#region Factory
  static factory(api: ODataApi, segments: ODataPathSegments, query: ODataQueryOptions) {
    segments.add(PathSegmentNames.count, $COUNT).type('Edm.Int32');
    query.keep(QueryOptionNames.filter, QueryOptionNames.search);
    return new ODataCountResource(api, segments, query);
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
    return new ODataCountResource(this.api, this.cloneSegments(), this.cloneQuery());
  }
  //#endregion

  //#region Shortcuts
  fetch(options?: HttpOptions): Observable<number> {
    return super.get({responseType: 'value', ...options});
  }

  fetchValue(options?: HttpOptions): Observable<number> {
    return this.fetch(options);
  }
  //#endregion
}
