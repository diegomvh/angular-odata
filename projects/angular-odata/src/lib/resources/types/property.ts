import { Observable } from 'rxjs';

import { ODataValueResource } from './value';

import { ODataResource } from '../resource';
import { ODataQueryOptions } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { HttpPropertyOptions, HttpEntitiesOptions, HttpEntityOptions, HttpOptions } from './options';
import { ODataProperty, ODataEntities, ODataEntity } from '../responses';
import { map } from 'rxjs/operators';
import { ODataStructuredTypeParser } from '../../parsers/structured-type';
import { ODataModel, ODataCollection } from '../../models';
import { ODataApi } from '../../api';

export class ODataPropertyResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<P>(api: ODataApi, path: string, type: string | undefined, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.segment(PathSegmentNames.property, path)
    if (type)
      segment.setType(type)
    options.clear();
    return new ODataPropertyResource<P>(api, segments, options);
  }

  clone() {
    return new ODataPropertyResource<T>(this.api, this.pathSegments.clone(), this.queryOptions.clone());
  }
  //#endregion

  //#region Function Config
  get schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findStructuredTypeForType<T>(type) : undefined;
  }
  ////#endregion

  //#region Inmutable Resource
  value() {
    return ODataValueResource.factory<T>(this.api, this.type(), this.pathSegments.clone(), this.queryOptions.clone());
  }

  property<P>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.findParserForType<P>(type);
      type = parser instanceof ODataStructuredTypeParser?
        parser.typeFor(path) : undefined;
    }
    return ODataPropertyResource.factory<P>(this.api, path, type, this.pathSegments.clone(), this.queryOptions.clone());
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
  fetch(options?: HttpOptions): Observable<T | null> {
    return this.get(
      Object.assign<HttpOptions, HttpPropertyOptions>(<HttpPropertyOptions>{ responseType: 'property' }, options || {})
    ).pipe(map(({property}) => property));
  }

  model(options?: HttpOptions): Observable<ODataModel<T> | null> {
    return this.get(
      Object.assign<HttpOptions, HttpEntityOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {})
    ).pipe(map(({entity, meta}) => entity ? this.asModel(entity, meta) : null));
  }

  collection(options?: HttpOptions): Observable<ODataCollection<T, ODataModel<T>> | null> {
    return this.get(
      Object.assign<HttpOptions, HttpEntitiesOptions>(<HttpEntitiesOptions>{ responseType: 'entities' }, options || {})
    ).pipe(map(({entities, meta}) => entities ? this.asCollection(entities, meta) : null));
  }
  //#endregion
}
