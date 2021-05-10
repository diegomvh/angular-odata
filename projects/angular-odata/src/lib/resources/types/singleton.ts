import { Observable } from 'rxjs';

import { Expand, Select } from '../builder';
import { QueryOptionNames } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataResource } from '../resource';

import { ODataNavigationPropertyResource } from './navigation-property';
import { ODataPropertyResource } from './property';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { HttpOptions, HttpEntityOptions } from './options';
import { ODataStructuredTypeParser } from '../../parsers/structured-type';
import { ODataEntity, ODataEntityMeta } from '../responses';
import { map } from 'rxjs/operators';
import { ODataModel } from '../../models';
import { ODataApi } from '../../api';
import { EntityKey } from '../../types';

export class ODataSingletonResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<R>(api: ODataApi, path: string, type: string | undefined, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.add(PathSegmentNames.singleton, path)
    if (type !== undefined)
      segment.type(type);
    options.keep(QueryOptionNames.format);
    return new ODataSingletonResource<R>(api, segments, options);
  }

  clone() {
    return new ODataSingletonResource<T>(this.api, this.pathSegments.clone(), this.queryOptions.clone());
  }
  //#endregion

  asModel<M extends ODataModel<T>>(entity: Partial<T> | {[name: string]: any}, {meta, reset}: { meta?: ODataEntityMeta, reset?: boolean} = {}): M {
    let schema = this.schema;
    if (meta?.type !== undefined) {
      schema = this.api.findStructuredTypeForType(meta.type);
    }
    const Model = schema?.model || ODataModel;
    return new Model(entity, {resource: this, meta, reset}) as M;
  }

  //#region Function Config
  get schema() {
    let type = this.type();
    return (type !== undefined) ? this.api.findStructuredTypeForType<T>(type) : undefined;
  }
  ////#endregion

  //#region Inmutable Resource
  key(key: EntityKey<T>) {
    const singleton = this.clone();
    singleton.segment.singleton().key(key);
    return singleton;
  }
  entity(key: EntityKey<T>) {
    const singleton = this.clone();
    singleton.segment.singleton().key(key);
    return singleton;
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
      type = callable.type();
    }
    return ODataActionResource.factory<P, R>(this.api, path, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  function<P, R>(name: string) {
    let type;
    let path = name;
    const callable = this.api.findCallableForType(name);
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
    }
    return ODataFunctionResource.factory<P, R>(this.api, path, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  select(opts: Select<T>) {
    let options = this.queryOptions.clone();
    options.option<Select<T>>(QueryOptionNames.select, opts);
    return new ODataSingletonResource<T>(this.api, this.pathSegments.clone(), options);
  }

  expand(opts: Expand<T>) {
    let options = this.queryOptions.clone();
    options.option<Expand<T>>(QueryOptionNames.expand, opts);
    return new ODataSingletonResource<T>(this.api, this.pathSegments.clone(), options);
  }

  format(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataSingletonResource<T>(this.api, this.pathSegments.clone(), options);
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const segments = this.pathSegments;
    return {
      singleton() {
        return segments.get(PathSegmentNames.singleton);
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
      }
    }
  }
  //#endregion

  //#region Requests
  get(options: HttpOptions & { etag?: string } = {}): Observable<ODataEntity<T>> {
    return super.get({responseType: 'entity', ...options});
  }

  post(attrs: Partial<T>, options: HttpOptions = {}): Observable<ODataEntity<T>> {
    return super.post(attrs, {responseType: 'entity', ...options});
  }

  put(attrs: Partial<T>, options: HttpOptions & { etag?: string } = {}): Observable<ODataEntity<T>> {
    return super.put(attrs, {responseType: 'entity', ...options});
  }

  patch(attrs: Partial<T>, options: HttpOptions & { etag?: string } = {}): Observable<T> {
    return super.patch(attrs, {responseType: 'entity', ...options});
  }

  delete(options: HttpOptions & { etag?: string } = {}): Observable<any> {
    return super.delete({responseType: 'entity', ...options});
  }
  //#endregion

  //#region Custom
  fetch(options?: HttpOptions & { etag?: string }): Observable<T | null> {
    return this.get(options).pipe(map(({entity}) => entity));
  }

  fetchModel(options?: HttpOptions & { etag?: string }): Observable<ODataModel<T> | null> {
    return this.get(options).pipe(map(({entity, meta}) => entity ? this.asModel(entity, {meta, reset: true}) : null));
  }
  //#endregion
}
