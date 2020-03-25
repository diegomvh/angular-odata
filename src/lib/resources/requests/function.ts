import { ODataPathSegments, SegmentTypes, SegmentOptionTypes } from '../path-segments';
import { ODataQueryOptions, QueryOptionTypes } from '../query-options';
import { ODataClient } from '../../client';
import { PlainObject, $COUNT } from '../../types';
import { Parser } from '../../models';
import { ODataCallableResource } from './callable';
import { ODataEntityAnnotations, ODataCollectionAnnotations, ODataPropertyAnnotations } from '../responses/annotations';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Types } from '../../utils';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions } from '../http-options';

export class ODataFunctionResource<T> extends ODataCallableResource<T> {

  // Factory
  static factory<R>(name: string, service: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parser?: Parser<R>}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.functionCall, name);
    options.keep(QueryOptionTypes.format);
    return new ODataFunctionResource<R>(service, segments, options, parser);
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
  get(options?: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;

  get(options?: HttpEntitiesOptions): Observable<[T[], ODataCollectionAnnotations]>;

  get(options?: HttpPropertyOptions): Observable<[T, ODataPropertyAnnotations]>;

  get(options?: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions): Observable<any> {

    let params = options && options.params;
    if (options && options.withCount)
      params = this.client.mergeHttpParams(params, {[$COUNT]: 'true'})

    let res$ = this.client.get<T>(this, {
      headers: options && options.headers,
      observe: 'body',
      params: params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
    if (options && options.responseType) {
      switch (options.responseType) {
        case 'entity':
          return res$.pipe(map((body: any) => this.toEntity(body)));
        case 'entities':
          return res$.pipe(map((body: any) => this.toEntities(body)));
        case 'property':
          return res$.pipe(map((body: any) => this.toValue(body)));
      }
    }
    return res$;
  }
}
