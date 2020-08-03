import { Observable } from 'rxjs';

import { ODataValueResource } from './value';

import { ODataResource } from '../resource';
import { ODataQueryOptions } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataClient } from '../../client';
import { HttpPropertyOptions, HttpEntitiesOptions, HttpEntityOptions, HttpOptions } from './options';
import { ODataProperty, ODataEntities, ODataEntity } from '../responses/index';
import { map } from 'rxjs/operators';
import { ODataEntityParser } from '../../parsers/entity';

export class ODataPropertyResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<P>(client: ODataClient, path: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.property, path).setType(type)
    options.clear();
    return new ODataPropertyResource<P>(client, segments, options);
  }

  clone() {
    return super.clone<ODataPropertyResource<T>>();
  }
  //#endregion

  //#region Inmutable Resource
  value() {
    return ODataValueResource.factory<T>(this.client, this.type(), this.pathSegments.clone(), this.queryOptions.clone());
  }

  property<P>(name: string) {
    let parser = this.client.parserFor<P>(this);
    let type = parser instanceof ODataEntityParser? 
      parser.typeFor(name) : null;
    return ODataPropertyResource.factory<P>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }
  //#endregion

  //#region Requests
  get(options: HttpEntityOptions): Observable<ODataEntity<T>>;
  get(options: HttpEntitiesOptions): Observable<ODataEntities<T>>;
  get(options: HttpPropertyOptions): Observable<ODataProperty<T>>;
  get(options: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Custom 
  fetch(options?: HttpOptions): Observable<T> {
    return this.get(
      Object.assign<HttpOptions, HttpPropertyOptions>(<HttpPropertyOptions>{ responseType: 'property' }, options || {})
    ).pipe(map(({property}) => property));
  }
  //#endregion
}
