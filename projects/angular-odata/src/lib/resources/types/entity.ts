import { Observable, throwError } from 'rxjs';

import { EntityKey } from '../../types';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataNavigationPropertyResource } from './navigation-property';
import { ODataPropertyResource } from './property';
import { Expand, Select, PlainObject } from '../builder';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataResource } from '../resource';
import { HttpOptions, HttpEntityOptions } from './options';
import { ODataValueResource } from './value';
import { ODataEntity, ODataEntityMeta } from '../responses';
import { map } from 'rxjs/operators';
import { ODataStructuredTypeParser } from '../../parsers/structured-type';
import { ODataModel } from '../../models';
import { ODataApi } from '../../api';

export class ODataEntityResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(api: ODataApi, segments: ODataPathSegments, options: ODataQueryOptions) {
    options.keep(QueryOptionNames.expand, QueryOptionNames.select, QueryOptionNames.format);
    return new ODataEntityResource<E>(api, segments, options);
  }

  clone() {
    return new ODataEntityResource<T>(this.api, this.pathSegments.clone(), this.queryOptions.clone());
  }
  //#endregion

  asModel<M extends ODataModel<T>>(entity: Partial<T>, meta?: ODataEntityMeta): M {
    let schema = this.schema;
    const Model = schema?.model || ODataModel;
    if (meta?.context.type !== undefined) {
      schema = this.api.findStructuredTypeForType(meta.context.type);
    }
    return new Model(entity, {resource: this, meta}) as M;
  }

  //#region Entity Config
  get schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findStructuredTypeForType<T>(type) :
      undefined;
  }
  ////#endregion

  //#region Inmutable Resource
  key(key: EntityKey<T>) {
    const entity = this.clone();
    entity.segment.entitySet().key(key);
    return entity;
  }

  value() {
    return ODataValueResource.factory<T>(this.api, this.type(), this.pathSegments.clone(), this.queryOptions.clone());
  }

  navigationProperty<N>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.findParserForType<N>(type);
      type = parser instanceof ODataStructuredTypeParser?
        parser.typeFor(path) : undefined;
    }
    return ODataNavigationPropertyResource.factory<N>(this.api, path, type, this.pathSegments.clone(), this.queryOptions.clone());
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

  action<P, R>(name: string) {
    let type;
    let path = name;
    const callable = this.api.findCallableForType(name);
    if (callable !== undefined) {
      path = callable.path();
      type = callable.parser.type;
    }
    return ODataActionResource.factory<P, R>(this.api, path, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  function<P, R>(name: string) {
    let type;
    let path = name;
    const callable = this.api.findCallableForType(name);
    if (callable !== undefined) {
      path = callable.path();
      type = callable.parser.type;
    }
    return ODataFunctionResource.factory<P, R>(this.api, path, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  cast<C>(type: string) {
    let segments = this.pathSegments.clone();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataEntityResource<C>(this.api, segments, this.queryOptions.clone());
  }

  select(opts: Select<T>) {
    let options = this.queryOptions.clone();
    options.option<Select<T>>(QueryOptionNames.select, opts);
    return new ODataEntityResource<T>(this.api, this.pathSegments.clone(), options);
  }

  expand(opts: Expand<T>) {
    let options = this.queryOptions.clone();
    options.option<Expand<T>>(QueryOptionNames.expand, opts);
    return new ODataEntityResource<T>(this.api, this.pathSegments.clone(), options);
  }

  format(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataEntityResource<T>(this.api, this.pathSegments.clone(), options);
  }

  custom(opts: PlainObject) {
    let options = this.queryOptions.clone();
    options.option<PlainObject>(QueryOptionNames.custom, opts);
    return new ODataEntityResource<T>(this.api, this.pathSegments.clone(), options);
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const segments = this.pathSegments;
    return {
      entitySet() {
        return segments.get(PathSegmentNames.entitySet);
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
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {})
    );
  }

  post(attrs: Partial<T>, options?: HttpOptions): Observable<ODataEntity<T>> {
    return super.post(attrs,
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {})
    );
  }

  put(attrs: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<ODataEntity<T>> {
    return super.put(attrs,
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {})
    );
  }

  patch(attrs: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<ODataEntity<T>> {
    return super.patch(attrs,
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {})
    );
  }

  delete(options?: HttpOptions & { etag?: string }): Observable<any> {
    return super.delete(
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {})
    );
  }
  //#endregion

  //#region Custom
  fetch(options?: HttpOptions): Observable<T | null> {
    if (!this.segment.entitySet().hasKey())
      return throwError("Resource without key");
    return this.get(options).pipe(map(({ entity }) => entity));
  }

  model(options?: HttpOptions): Observable<ODataModel<T> | null> {
    if (!this.segment.entitySet().hasKey())
      return throwError("Resource without key");
    return this.get(options).pipe(map(({ entity, meta }) => entity ? this.asModel(entity, meta) : null));
  }
  //#endregion
}
