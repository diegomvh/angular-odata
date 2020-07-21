import { Observable } from 'rxjs';

import { ODataClient } from '../../client';

import { ODataPathSegments, PathSegmentNames, SegmentOptionNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataValueAnnotations } from '../responses/annotations';
import { HttpEntityOptions, HttpEntitiesOptions, HttpValueOptions, HttpOptions } from '../http-options';

import { ODataCallableResource } from './callable';

export class ODataFunctionResource<T> extends ODataCallableResource<T> {
  //#region Factory
  static factory<R>(client: ODataClient, name: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.function, name).setType(type);
    options.keep(QueryOptionNames.format);
    return new ODataFunctionResource<R>(client, segments, options);
  }

  clone() {
    return super.clone<ODataFunctionResource<T>>();
  }
  //#endregion

  //#region Requests
  get(options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;
  get(options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;
  get(options: HttpValueOptions): Observable<[T, ODataValueAnnotations]>;
  get(options: HttpEntityOptions & HttpEntitiesOptions & HttpValueOptions): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Custom call 
  call(
    args: any | null, 
    responseType: 'json' | 'value' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any> {
    let opts = Object.assign<any, HttpOptions>({ responseType }, options || {});
    let segment = this.pathSegments.last();
    if (!segment)
      throw new Error(`FunctionResourse dosn't have segment`);
    segment.option(SegmentOptionNames.parameters, args);
    return this.get(opts) as Observable<any>;
  }
  //#endregion
}
