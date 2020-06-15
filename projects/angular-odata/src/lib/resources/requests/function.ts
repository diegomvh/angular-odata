import { Observable } from 'rxjs';

import { ODataClient } from '../../client';
import { Types } from '../../utils';

import { PlainObject } from '../builder';
import { ODataPathSegments, PathSegmentNames, SegmentOptionNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataValueAnnotations } from '../responses/annotations';
import { HttpEntityOptions, HttpEntitiesOptions, HttpValueOptions, HttpOptions } from '../http-options';

import { ODataCallableResource } from './callable';

export class ODataFunctionResource<T> extends ODataCallableResource<T> {

  // Factory
  static factory<R>(client: ODataClient, name: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.function, name).setType(type);
    options.keep(QueryOptionNames.format);
    return new ODataFunctionResource<R>(client, segments, options);
  }

  // Parameters
  parameters(params?: PlainObject) {
    let segment = this.pathSegments.last();
    if (!segment)
      throw new Error(`FunctionResourse dosn't have segment`);
    if (Types.isUndefined(params))
      return segment.option(SegmentOptionNames.parameters);
    
    return segment.option(SegmentOptionNames.parameters, params);
  }

  //GET
  get(options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;
  get(options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;
  get(options: HttpValueOptions): Observable<[T, ODataValueAnnotations]>;
  get(options: HttpEntityOptions & HttpEntitiesOptions & HttpValueOptions): Observable<any> {
    return super.get(options);
  }

  call(
    args: any | null, 
    responseType: 'json' | 'value' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any> {
    let ops = Object.assign<any, HttpOptions>({ responseType }, options || {});
    if (args)
      this.parameters(args);
    return this.get(ops) as Observable<any>;
  }
}
