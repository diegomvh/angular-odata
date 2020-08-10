import { Observable, throwError, empty } from 'rxjs';

import { EntityKey } from '../../types';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { Expand, Select, PlainObject } from '../builder';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataPathSegments, SegmentOptionNames, PathSegmentNames } from '../path-segments';
import { ODataClient } from '../../client';
import { ODataResource } from '../resource';
import { Types } from '../../utils/types';
import { HttpOptions, HttpEntityOptions } from './options';
import { ODataValueResource } from './value';
import { ODataEntity } from '../responses/index';
import { map, catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ODataEntityParser } from '../../parsers/entity';

export class ODataEntityResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(client: ODataClient, segments: ODataPathSegments, options: ODataQueryOptions) {
    options.keep(QueryOptionNames.expand, QueryOptionNames.select, QueryOptionNames.format);
    return new ODataEntityResource<E>(client, segments, options);
  }

  clone() {
    return super.clone<ODataEntityResource<T>>();
  }
  //#endregion

  //#region Entity Config
  get config() {
    return this.client
    .apiConfigFor(this)
    .entityConfigForType<T>(this.type());
  }
  ////#endregion

  //#region Inmutable Resource
  key(key: EntityKey<T>) {
    const entity = this.clone(); 
    entity.segment.key(key);
    return entity;
  }

  value() {
    return ODataValueResource.factory<T>(this.client, this.type(), this.pathSegments.clone(), this.queryOptions.clone());
  }

  navigationProperty<N>(name: string) {
    let parser = this.client.parserFor<N>(this);
    let type = parser instanceof ODataEntityParser? 
      parser.typeFor(name) : null;
    return ODataNavigationPropertyResource.factory<N>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  property<P>(name: string) {
    let parser = this.client.parserFor<P>(this);
    let type = parser instanceof ODataEntityParser? 
      parser.typeFor(name) : null;
    return ODataPropertyResource.factory<P>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  action<P, R>(type: string) {
    const config = this.client.callableConfigForType<R>(type);
    const path = config ? config.path : type;
    return ODataActionResource.factory<P, R>(this.client, path, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  function<P, R>(type: string) {
    const config = this.client.callableConfigForType<R>(type);
    const path = config ? config.path : type;
    return ODataFunctionResource.factory<P, R>(this.client, path, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  cast<C extends T>(type: string) {
    let segments = this.pathSegments.clone();
    segments.segment(PathSegmentNames.type, type).setType(type);
    return new ODataEntityResource<C>(this.client, segments, this.queryOptions.clone());
  }

  select(opts: Select<T>) {
    let options = this.queryOptions.clone();
    options.option<Select<T>>(QueryOptionNames.select, opts);
    return new ODataEntityResource<T>(this.client, this.pathSegments.clone(), options);
  }

  expand(opts: Expand<T>) {
    let options = this.queryOptions.clone();
    options.option<Expand<T>>(QueryOptionNames.expand, opts);
    return new ODataEntityResource<T>(this.client, this.pathSegments.clone(), options);
  }

  format(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataEntityResource<T>(this.client, this.pathSegments.clone(), options);
  }

  custom(opts: PlainObject) {
    let options = this.queryOptions.clone();
    options.option<PlainObject>(QueryOptionNames.custom, opts);
    return new ODataEntityResource<T>(this.client, this.pathSegments.clone(), options);
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const res = this;
    const client = this.client;
    const segments = this.pathSegments;
    return {
      entitySet(name?: string) {
        let segment = segments.segment(PathSegmentNames.entitySet);
        if (!segment)
          throw new Error(`EntityResourse dosn't have segment for entitySet`);
        if (!Types.isUndefined(name))
          segment.setPath(name);
        return segment;
      },
      key(key?: EntityKey<T>) {
        let segment = segments.segment(PathSegmentNames.entitySet);
        if (!segment)
          throw new Error(`EntityResourse dosn't have segment for key`);
        if (!Types.isUndefined(key)) {
          let parser = client.parserFor<T>(res);
          if (parser instanceof ODataEntityParser && Types.isObject(key))
            key = parser.resolveKey(key);
          segment.option(SegmentOptionNames.key, key);
        }
        return segment.option<EntityKey<T>>(SegmentOptionNames.key);
      }
    }
  }

  get query() {
    const options = this.queryOptions;
    return {
      select(opts?: Select<T>) {
        return options.option<Select<T>>(QueryOptionNames.select, opts);
      },
      expand(opts?: Expand<T>) {
        return options.option<Expand<T>>(QueryOptionNames.expand, opts);
      },
      format(opts?: string) {
        return options.option<string>(QueryOptionNames.format, opts);
      },
      custom(opts?: PlainObject) {
        return options.option<PlainObject>(QueryOptionNames.custom, opts);
      }
    }
  }
  //#endregion

  //#region Requests
  get(options?: HttpOptions): Observable<ODataEntity<T>> {
    return super.get(
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
      );
  }

  post(attrs: Partial<T>, options?: HttpOptions): Observable<ODataEntity<T>> {
    return super.post(attrs,
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  put(attrs: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<ODataEntity<T>> {
    return super.put(attrs,
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  patch(attrs: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<ODataEntity<T>> {
    return super.patch(attrs,
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  delete(options?: HttpOptions & { etag?: string }): Observable<any> {
    return super.delete(options);
  }
  //#endregion

  //#region Custom
  fetch(options?: HttpOptions): Observable<T> {
    if (this.segment.key().empty())
      return throwError("Resource without key");
    return this.get(options).pipe(map(({entity}) => entity));
  }
  //#endregion
}
