import { Observable } from 'rxjs';

import { ODataClient } from '../../client';

import { ODataPathSegments, PathSegmentNames, SegmentOptionNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataPropertyAnnotations } from '../responses/annotations';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpOptions } from '../http-options';

import { ODataCallableResource } from './callable';

export class ODataFunctionResource<T> extends ODataCallableResource<T> {
  //#region Factory
  static factory<R>(client: ODataClient, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.function, type).setType(type);
    options.clear();
    return new ODataFunctionResource<R>(client, segments, options);
  }

  clone() {
    return super.clone<ODataFunctionResource<T>>();
  }
  //#endregion

  //#region Requests
  get(options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;
  get(options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;
  get(options: HttpPropertyOptions): Observable<[T, ODataPropertyAnnotations]>;
  get(options: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Custom call 
  call(
    args: any | null, 
    responseType: 'property' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any> {
    let opts = Object.assign<any, HttpOptions>({ responseType }, options || {});
    let segment = this.pathSegments.last();
    if (!segment)
      throw new Error(`FunctionResourse dosn't have segment`);
    segment.option(SegmentOptionNames.parameters, this.serialize(args));
    return this.get(opts) as Observable<any>;
  }
  //#endregion
}
