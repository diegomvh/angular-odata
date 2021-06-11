import { Observable, throwError } from 'rxjs';

import { EntityKey } from '../../types';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataNavigationPropertyResource } from './navigation-property';
import { ODataPropertyResource } from './property';
import { Expand, isQueryCustomType, Select } from '../builder';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataResource } from '../resource';
import { HttpOptions } from './options';
import { ODataValueResource } from './value';
import { ODataEntity, ODataEntityAnnotations } from '../responses';
import { map } from 'rxjs/operators';
import { ODataStructuredTypeParser } from '../../parsers/structured-type';
import { ODataModel } from '../../models';
import { ODataApi } from '../../api';
import { Objects, Types } from '../../utils';
export class ODataEntityResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(api: ODataApi, segments: ODataPathSegments, options: ODataQueryOptions) {
    options.keep(QueryOptionNames.expand, QueryOptionNames.select, QueryOptionNames.format);
    return new ODataEntityResource<E>(api, segments, options);
  }

  clone() {
    return new ODataEntityResource<T>(this.api, this.cloneSegments(), this.cloneQuery());
  }
  //#endregion

  asModel<M extends ODataModel<T>>(entity: Partial<T> | {[name: string]: any}, {annots, reset}: {annots?: ODataEntityAnnotations, reset?: boolean} = {}): M {
    let schema = this.schema;
    if (annots?.type !== undefined) {
      schema = this.api.findStructuredTypeForType(annots.type);
    }
    const Model = schema?.model || ODataModel;
    return new Model(entity, { resource: this, annots, reset }) as M;
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
    key = (this.schema !== undefined && Types.isObject(key) && !isQueryCustomType(key)) ? this.schema.resolveKey(key as {[name: string]: any}) :
      (Types.isObject(key) && !isQueryCustomType(key)) ? Objects.resolveKey(key) : key;
    entity.segment.entitySet().key(key);
    return entity;
  }

  value() {
    return ODataValueResource.factory<T>(this.api, this.type(), this.cloneSegments(), this.cloneQuery());
  }

  navigationProperty<N>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.findParserForType<N>(type);
      type = parser instanceof ODataStructuredTypeParser ?
        parser.typeFor(path) : undefined;
    }
    return ODataNavigationPropertyResource.factory<N>(this.api, path, type, this.cloneSegments(), this.cloneQuery());
  }

  property<P>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.findParserForType<P>(type);
      type = parser instanceof ODataStructuredTypeParser ?
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

  //TODO: Check
  cast<C>(type: string) {
    let segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataEntityResource<C>(this.api, segments, this.cloneQuery());
  }

  select(opts: Select<T>) {
    let options = this.cloneQuery();
    options.option<Select<T>>(QueryOptionNames.select, opts);
    return new ODataEntityResource<T>(this.api, this.cloneSegments(), options);
  }

  expand(opts: Expand<T>) {
    let options = this.cloneQuery();
    options.option<Expand<T>>(QueryOptionNames.expand, opts);
    return new ODataEntityResource<T>(this.api, this.cloneSegments(), options);
  }

  format(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataEntityResource<T>(this.api, this.cloneSegments(), options);
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

  patch(attrs: Partial<T>, options: HttpOptions & { etag?: string } = {}): Observable<ODataEntity<T>> {
    return super.patch(attrs, {responseType: 'entity', ...options});
  }

  delete(options: HttpOptions & { etag?: string } = {}): Observable<any> {
    return super.delete({responseType: 'entity', ...options});
  }
  //#endregion

  //#region Shortcuts
  fetch(options?: HttpOptions & { etag?: string }): Observable<ODataEntity<T>> {
    if (!this.hasKey())
      return throwError("Entity resource without key");
    return this.get(options);
  }

  fetchEntity(options?: HttpOptions & { etag?: string }): Observable<T | null> {
    return this.fetch(options).pipe(map(({ entity }) => entity));
  }

  fetchModel(options?: HttpOptions & { etag?: string }): Observable<ODataModel<T> | null> {
    return this.fetch(options).pipe(map(({ entity, annots }) => entity ? this.asModel(entity, { annots, reset: true }) : null));
  }
  //#endregion
}
