import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { map } from 'rxjs/operators';
import { ODataClient } from '../../client';
import { HttpOptions } from './options';
import { ODataMetadata } from '../responses';
import { $METADATA } from '../../constants';
import { ODataApi } from '../../api';

export class ODataMetadataResource extends ODataResource<any> {
  private _api: ODataApi;

  constructor(client: ODataClient, api?: ODataApi, segments?: ODataPathSegments) {
    super(client, segments);
    this._api = api || client.apiFor(this);
  }

  clone() {
    return new ODataMetadataResource(this.client, this._api, this.pathSegments.clone());
  }

  //#region Factory
  static factory(client: ODataClient, api?: ODataApi) {
    let segments = new ODataPathSegments();
    segments.segment(PathSegmentNames.metadata, $METADATA);
    return new ODataMetadataResource(client, api, segments);
  }
  //#endregion

  //#region Api Config
  get api(): ODataApi {
    return this._api;
  }
  //#endregion

  //#region Requests
  get(options?: HttpOptions): Observable<ODataMetadata> {
    let opts = Object.assign<any, HttpOptions>({ observe: 'body', responseType: 'text' }, options || {});
    return this.client.get(this, opts).pipe(map((body: any) => new ODataMetadata(body)));
  }
  //#endregion
}
