import { Observable } from 'rxjs';

import { ODataValueResource } from './value';

import { ODataResource } from '../resource';
import { ODataQueryOptions } from '../query-options';
import { ODataPathSegments, SegmentTypes } from '../path-segments';
import { ODataClient } from '../../client';
import { map } from 'rxjs/operators';
import { ODataPropertyAnnotations, ODataEntitiesAnnotations, ODataAnnotations } from '../responses';
import { EntityKey, $COUNT, Parser } from '../../types';
import { HttpPropertyOptions, HttpEntitiesOptions } from '../http-options';
import { ODataToEntityResource } from './entity';

export class ODataPropertyResource<T> extends ODataResource<T> implements ODataToEntityResource<T> {

  // Factory
  static factory<P>(name: string, client: ODataClient, opts?: {
      segments?: ODataPathSegments, 
      options?: ODataQueryOptions,
      parser?: Parser<P>}
  ) {
    let segments = opts && opts.segments || new ODataPathSegments();
    let options = opts && opts.options || new ODataQueryOptions();
    let parser = opts && opts.parser || null;

    segments.segment(SegmentTypes.property, name);
    options.clear();
    return new ODataPropertyResource<P>(client, segments, options, parser);
  }

  entity(key?: EntityKey<T>, annots?: ODataAnnotations) {
    return this;
  }

  // Segments
  value() {
    return ODataValueResource.factory<T>(
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser
    });
  }

  property<P>(name: string) {
    return ODataPropertyResource.factory<P>(
      name,
      this.client, {
      segments: this.pathSegments.clone(),
      options: this.queryOptions.clone(),
      parser: this.parser ? this.parser.parserFor<P>(name) : null
    });
  }

  get(options: HttpPropertyOptions): Observable<[T, ODataPropertyAnnotations]>;

  get(options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;

  get(options: HttpPropertyOptions & HttpEntitiesOptions): Observable<any> {

    let params = options && options.params;
    if (options && options.withCount)
      params = this.client.mergeHttpParams(params, {[$COUNT]: 'true'})

    let res$ = this.client.get<T>(this, {
      headers: options.headers,
      observe: 'body',
      params: params,
      responseType: 'json',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
    switch (options.responseType) {
      case 'property':
        return res$.pipe(map((body: any) => this.toValue(body)));
      case 'entities':
        return res$.pipe(map((body: any) => this.toEntities(body)));
    }
  }
}
