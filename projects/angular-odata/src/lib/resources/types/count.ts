import { PathSegmentNames, QueryOptionNames } from '../../types';

import { $COUNT } from '../../constants';
import { ODataApi } from '../../api';
import { ODataOptions } from './options';
import { ODataPathSegments } from '../path-segments';
import { ODataQueryOptions, Filter } from '../query';
import { ODataResource } from '../resource';
import { Observable } from 'rxjs';

export class ODataCountResource extends ODataResource<any> {
  //#region Factory
  static factory(
    api: ODataApi,
    segments: ODataPathSegments,
    query: ODataQueryOptions
  ) {
    segments.add(PathSegmentNames.count, $COUNT).type('Edm.Int32');
    query.keep(QueryOptionNames.filter, QueryOptionNames.search);
    return new ODataCountResource(api, segments, query);
  }
  //#endregion

  clone() {
    return new ODataCountResource(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }
  schema() {
    return undefined;
  }

  get segment() {
    const segments = this.pathSegments;
    return {
      entitySet() {
        return segments.get(PathSegmentNames.entitySet);
      },
      navigationProperty() {
        return segments.get(PathSegmentNames.navigationProperty);
      },
    };
  }

  get query() {
    const options = this.queryOptions;
    return {
      search(opts?: string) {
        return options.option<string>(QueryOptionNames.search, opts);
      },
      filter(opts?: Filter) {
        return options.option<Filter>(QueryOptionNames.filter, opts);
      },
    };
  }

  //#region Requests
  protected get(options?: ODataOptions): Observable<number> {
    return super.get({ responseType: 'value', ...options });
  }
  //#endregion

  //#region Shortcuts
  /**
   * Fetch the count of the set.
   * @param options Options for the request
   * @returns The count of the set
   */
  fetch(options?: ODataOptions): Observable<number> {
    return this.get(options);
  }
  //#endregion
}
