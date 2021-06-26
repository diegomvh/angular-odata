import { Observable } from 'rxjs';

import { Expand, isQueryCustomType, Select } from '../builder';
import { QueryOptionNames } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { EntityKey, ODataResource } from '../resource';

import { ODataNavigationPropertyResource } from './navigation-property';
import { ODataPropertyResource } from './property';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { HttpOptions } from './options';
import { ODataStructuredTypeParser } from '../../parsers/structured-type';
import { ODataEntity, ODataEntityAnnotations } from '../responses';
import { map } from 'rxjs/operators';
import { ODataModel } from '../../models';
import { ODataApi } from '../../api';
import { Types } from '../../utils/types';
import { Objects } from '../../utils';

export class ODataSingletonResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<R>(api: ODataApi, path: string, type: string | undefined, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.add(PathSegmentNames.singleton, path)
    if (type !== undefined)
      segment.type(type);
    options.keep(QueryOptionNames.format);
    return new ODataSingletonResource<R>(api, segments, options);
  }
  //#endregion

  clone() {
    return new ODataSingletonResource<T>(this.api, this.cloneSegments(), this.cloneQuery());
  }

  schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findStructuredTypeForType<T>(type) :
      undefined;
  }

  asModel<M extends ODataModel<T>>(entity: Partial<T> | {[name: string]: any}, {annots, reset}: {annots?: ODataEntityAnnotations, reset?: boolean} = {}): M {
    const Model = this.api.modelForType(annots?.type || this.type());
    return new Model(entity, { resource: this, annots, reset }) as M;
  }

  //#region Inmutable Resource
  key(value: any) {
    const singleton = this.clone();
    var key = this.resolveKey(value);
    if (key !== undefined)
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
    return ODataNavigationPropertyResource.factory<N>(this.api, path, type, this.cloneSegments(), this.cloneQuery());
  }

  property<P>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.findParserForType<P>(type);
      type = parser instanceof ODataStructuredTypeParser?
        parser.typeFor(path) : undefined;
    }
    return ODataPropertyResource.factory<P>(this.api, path, type, this.cloneSegments(), this.cloneQuery());
  }

  action<P, R>(name: string) {
    let type;
    let path = name;
    const callable = this.api.findCallableForType(name);
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
    }
    return ODataActionResource.factory<P, R>(this.api, path, type, this.cloneSegments(), this.cloneQuery());
  }

  function<P, R>(name: string) {
    let type;
    let path = name;
    const callable = this.api.findCallableForType(name);
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
    }
    return ODataFunctionResource.factory<P, R>(this.api, path, type, this.cloneSegments(), this.cloneQuery());
  }

  select(opts: Select<T>) {
    const clone = this.clone();
    clone.query.select(opts);
    return clone;
  }

  expand(opts: Expand<T>) {
    const clone = this.clone();
    clone.query.expand(opts);
    return clone;
  }

  format(opts: string) {
    const clone = this.clone();
    clone.query.format(opts);
    return clone;
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
    return this.entityQueryHandler();
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

  //#region Shortcuts
  fetch(options?: HttpOptions & { etag?: string }): Observable<ODataEntity<T>> {
    return this.get(options);
  }

  fetchEntity(options?: HttpOptions & { etag?: string }): Observable<T | null> {
    return this.fetch(options).pipe(map(({entity}) => entity));
  }

  fetchModel(options?: HttpOptions & { etag?: string }): Observable<ODataModel<T> | null> {
    return this.fetch(options).pipe(map(({entity, annots}) => entity ? this.asModel(entity, {annots, reset: true}) : null));
  }
  //#endregion
}
