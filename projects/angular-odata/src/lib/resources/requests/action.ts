import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataClient } from '../../client';
import { ODataCallableResource } from './callable';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataValueAnnotations } from '../responses/annotations';
import { HttpEntityOptions, HttpEntitiesOptions, HttpValueOptions, HttpOptions } from '../http-options';

export class ODataActionResource<T> extends ODataCallableResource<T> {
  //#region Factory
  static factory<R>(client: ODataClient, name: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.action, name).setType(type);
    options.clear();
    return new ODataActionResource<R>(client, segments, options);
  }
  //#endregion

  //#region Requests
  post(body: any | null, options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;
  post(body: any | null, options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;
  post(body: any | null, options: HttpValueOptions): Observable<[T, ODataValueAnnotations]>;
  post(body: any | null, options: HttpEntityOptions & HttpEntitiesOptions & HttpValueOptions): Observable<any> {
    return super.post(body, options);
  }
  //#endregion

  //#region Custom call 
  call(
    args: any | null, 
    responseType: 'json' | 'value' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any> {
    let opts = Object.assign<any, HttpOptions>({ responseType }, options || {});
    return this.post(args, opts) as Observable<any>;
  }
  //#endregion
}
