import { Observable } from 'rxjs';

import { ODataValueResource } from './value';

import { ODataResource } from '../resource';
import { ODataQueryOptions } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataClient } from '../../client';
import { HttpPropertyOptions, HttpEntitiesOptions, HttpEntityOptions, HttpOptions } from '../http-options';
import { ODataEntityParser } from '../../parsers/index';
import { ODataProperty, ODataEntities, ODataEntity } from '../response';
import { map } from 'rxjs/operators';

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
  get(options?: HttpOptions): Observable<ODataProperty<T>> {
    return super.get(
      Object.assign<HttpPropertyOptions, HttpOptions>(<HttpPropertyOptions>{responseType: 'property'}, options || {})
      );
  }
  //#endregion

  //#region Custom
  fetch(options?: HttpOptions): Observable<T> {
    return this.get(options).pipe(map(({property}) => property));
  }
  //#endregion
}
