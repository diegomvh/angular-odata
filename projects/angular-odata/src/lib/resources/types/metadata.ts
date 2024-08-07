import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { $METADATA, ACCEPT, APPLICATION_XML } from '../../constants';
import { PathSegment } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataResource } from '../resource';
import { ODataOptions } from './options';
import { ODataMetadata } from '../../metadata/metadata';
import { ODataMetadataParser } from '../../metadata';

export class ODataMetadataResource extends ODataResource<any> {
  constructor(api: ODataApi, segments?: ODataPathSegments) {
    super(api, { segments });
  }

  //#region Factory
  static factory(api: ODataApi) {
    let segments = new ODataPathSegments();
    segments.add(PathSegment.metadata, $METADATA);
    return new ODataMetadataResource(api, segments);
  }

  override clone(): ODataMetadataResource {
    return super.clone() as ODataMetadataResource;
  }
  //#endregion

  //#region Requests
  protected override get(options?: ODataOptions): Observable<any> {
    return super.get({
      responseType: 'text',
      ...options,
      headers: { [ACCEPT]: APPLICATION_XML },
    });
  }
  //#endregion

  //#region Shortcuts
  fetch(options?: ODataOptions): Observable<ODataMetadata> {
    return this.get(options).pipe(
      map((body: any) => new ODataMetadataParser(body).metadata()),
    );
  }
  //#endregion
}
