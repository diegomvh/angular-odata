import { $METADATA } from '../../constants';
import { ODataApi } from '../../api';
import { ODataMetadata } from '../responses';
import { ODataOptions } from './options';
import { ODataPathSegments } from '../path';
import { ODataResource } from '../resource';
import { Observable } from 'rxjs';
import { PathSegmentNames } from '../../types';
import { map } from 'rxjs/operators';

export class ODataMetadataResource extends ODataResource<any> {
  constructor(api: ODataApi, segments?: ODataPathSegments) {
    super(api, segments);
  }

  clone() {
    return new ODataMetadataResource(this.api, this.cloneSegments());
  }

  schema() {
    return undefined;
  }
  //#region Factory
  static factory(api: ODataApi) {
    let segments = new ODataPathSegments();
    segments.add(PathSegmentNames.metadata, $METADATA);
    return new ODataMetadataResource(api, segments);
  }
  //#endregion

  //#region Requests
  protected get(options?: ODataOptions): Observable<ODataMetadata> {
    return super
      .get({ responseType: 'text', ...options })
      .pipe(map((body: any) => new ODataMetadata(body)));
  }
  //#endregion

  //#region Shortcuts
  fetch(options?: ODataOptions): Observable<ODataMetadata> {
    return this.get(options);
  }
  //#endregion
}
