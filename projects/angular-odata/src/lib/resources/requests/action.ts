import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataClient } from '../../client';
import { ODataCallableResource } from './callable';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataPropertyAnnotations } from '../responses/annotations';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpOptions } from '../http-options';

export class ODataActionResource<T> extends ODataCallableResource<T> {
  //#region Factory
  static factory<R>(client: ODataClient, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.action, type).setType(type);
    options.clear();
    return new ODataActionResource<R>(client, segments, options);
  }

  clone() {
    return super.clone<ODataActionResource<T>>();
  }
  //#endregion

  //#region Requests
  post(body: any | null, options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;
  post(body: any | null, options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;
  post(body: any | null, options: HttpPropertyOptions): Observable<[T, ODataPropertyAnnotations]>;
  post(body: any | null, options: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions): Observable<any> {
    return super.post(body, options);
  }
  //#endregion

  //#region Custom call 
  call(
    args: any | null, 
    responseType: 'property' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any> {
    let opts = Object.assign<any, HttpOptions>({ responseType }, options || {});
    return this.post(args, opts) as Observable<any>;
  }
  //#endregion
}
