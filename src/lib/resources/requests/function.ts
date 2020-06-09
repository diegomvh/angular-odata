import { Observable } from 'rxjs';

import { ODataClient } from '../../client';
import { Parser } from '../../types';
import { Types } from '../../utils';

import { PlainObject } from '../builder';
import { ODataPathSegments, SegmentTypes, SegmentOptionTypes } from '../path-segments';
import { ODataQueryOptions, QueryOptionTypes } from '../query-options';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataValueAnnotations } from '../responses/annotations';
import { HttpEntityOptions, HttpEntitiesOptions, HttpValueOptions, HttpOptions } from '../http-options';

import { ODataCallableResource } from './callable';

export class ODataFunctionResource<T> extends ODataCallableResource<T> {

  // Factory
  static factory<R>(name: string, service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parse?: string} 
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();

    segments.segment(SegmentTypes.functionCall, name).setParse(opts.parse);
    options.keep(QueryOptionTypes.format);
    return new ODataFunctionResource<R>(service, segments, options);
  }

  // Parameters
  parameters(params?: PlainObject) {
    let segment = this.pathSegments.last();
    if (!segment)
      throw new Error(`FunctionResourse dosn't have segment`);
    if (Types.isUndefined(params))
      return segment.option(SegmentOptionTypes.parameters);
    
    return segment.option(SegmentOptionTypes.parameters, params);
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
