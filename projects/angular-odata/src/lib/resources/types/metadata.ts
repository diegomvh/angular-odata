import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { $METADATA } from '../../constants';
import { PathSegmentNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataResource } from '../resource';
import { ODataMetadata } from '../responses';
import { ODataOptions } from './options';

export class ODataMetadataResource extends ODataResource<any> {
  constructor(api: ODataApi, segments?: ODataPathSegments) {
    super(api, { segments });
  }

  //#region Factory
  static factory(api: ODataApi) {
    let segments = new ODataPathSegments();
    segments.add(PathSegmentNames.metadata, $METADATA);
    return new ODataMetadataResource(api, segments);
  }
  override clone(): ODataMetadataResource {
    return super.clone() as ODataMetadataResource;
  }
  //#endregion

  //#region Requests
  protected override get(
    options?: ODataOptions 
  ): Observable<any> {
    return super
      .get({ responseType: 'text', ...options });
  }
  //#endregion

  //#region Shortcuts
  fetch(options?: ODataOptions): Observable<ODataMetadata> {
    return this.get(options)
      .pipe(map((body: any) => new ODataMetadata(body)));
  }
  //#endregion
}
