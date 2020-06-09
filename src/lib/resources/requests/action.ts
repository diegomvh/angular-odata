import { Observable } from 'rxjs';

import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataClient } from '../../client';
import { ODataCallableResource } from './callable';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataValueAnnotations } from '../responses/annotations';
import { Parser } from '../../types';
import { HttpEntityOptions, HttpEntitiesOptions, HttpValueOptions, HttpOptions } from '../http-options';

export class ODataActionResource<T> extends ODataCallableResource<T> {
  // Factory
  static factory<R>(name: string, client: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parse?: string}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();

    segments.segment(SegmentTypes.actionCall, name).setParse(opts.parse);
    options.clear();
    return new ODataActionResource<R>(client, segments, options);
  }

  //POST
  post(body: any | null, options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;
  post(body: any | null, options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;
  post(body: any | null, options: HttpValueOptions): Observable<[T, ODataValueAnnotations]>;
  post(body: any | null, options: HttpEntityOptions & HttpEntitiesOptions & HttpValueOptions): Observable<any> {
    return super.post(body, options);
  }

  call(
    args: any | null, 
    responseType: 'json' | 'value' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any> {
    let ops = Object.assign<any, HttpOptions>({ responseType }, options || {});
    return this.post(args, ops) as Observable<any>;
  }
}
