import { EntityKey, ODataResource } from '../resource';
import { ODataEntity, ODataEntityAnnotations } from '../responses';
import { PathSegmentNames, QueryOptionNames } from '../../types';

import { ODataActionResource } from './action';
import { ODataApi } from '../../api';
import { ODataFunctionResource } from './function';
import { ODataModel } from '../../models';
import { ODataNavigationPropertyResource } from './navigation-property';
import { ODataOptions } from './options';
import { ODataPathSegments, ODataPathSegmentsHandler } from '../path';
import { ODataPropertyResource } from './property';
import {
  ODataQueryOptions,
  Expand,
  Select,
  ODataQueryOptionsHandler,
} from '../query';
import { ODataStructuredTypeParser } from '../../parsers/structured-type';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export class ODataSingletonResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<R>(
    api: ODataApi,
    path: string,
    type: string | undefined,
    segments: ODataPathSegments,
    options: ODataQueryOptions<R>
  ) {
    const segment = segments.add(PathSegmentNames.singleton, path);
    if (type !== undefined) segment.type(type);
    options.keep(QueryOptionNames.format);
    return new ODataSingletonResource<R>(api, segments, options);
  }
  //#endregion

  clone() {
    return new ODataSingletonResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  schema() {
    let type = this.type();
    return type !== undefined
      ? this.api.findStructuredTypeForType<T>(type)
      : undefined;
  }
  asModel<M extends ODataModel<T>>(
    entity: Partial<T> | { [name: string]: any },
    { annots, reset }: { annots?: ODataEntityAnnotations; reset?: boolean } = {}
  ): M {
    const Model = this.api.modelForType(annots?.type || this.type());
    return new Model(entity, { resource: this, annots, reset }) as M;
  }

  //#region Inmutable Resource
  key(value: any) {
    const singleton = this.clone();
    var key = this.resolveKey(value);
    if (key !== undefined) singleton.segment((s) => s.singleton().key(key));
    return singleton;
  }

  keys(values: any[]) {
    const singleton = this.clone();
    const types = this.pathSegments.types({ key: true });
    const keys = values.map((value, index) =>
      ODataResource.resolveKey(
        value,
        this.api.findStructuredTypeForType<T>(types[index])
      )
    );
    singleton.segment((s) => s.keys(keys));
    return singleton;
  }

  navigationProperty<N>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.parserForType<N>(type);
      type =
        parser instanceof ODataStructuredTypeParser
          ? parser.typeFor(path)
          : undefined;
    }
    return ODataNavigationPropertyResource.factory<N>(
      this.api,
      path,
      type,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  property<P>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.parserForType<P>(type);
      type =
        parser instanceof ODataStructuredTypeParser
          ? parser.typeFor(path)
          : undefined;
    }
    return ODataPropertyResource.factory<P>(
      this.api,
      path,
      type,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  action<P, R>(path: string) {
    let type;
    const callable = this.api.findCallableForType(path, this.type());
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
    }
    return ODataActionResource.factory<P, R>(
      this.api,
      path,
      type,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  function<P, R>(path: string) {
    let type;
    const callable = this.api.findCallableForType(path, this.type());
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
    }
    return ODataFunctionResource.factory<P, R>(
      this.api,
      path,
      type,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  select(opts: Select<T>) {
    const clone = this.clone();
    clone.query((q) => q.select(opts));
    return clone;
  }

  expand(opts: Expand<T>) {
    const clone = this.clone();
    clone.query((q) => q.expand(opts));
    return clone;
  }

  format(opts: string) {
    const clone = this.clone();
    clone.query((q) => q.format(opts));
    return clone;
  }
  //#endregion

  //#region Mutable Resource
  segment(func: (q: ODataPathSegmentsHandler<T>) => void) {
    func(this.pathSegmentsHandler());
    return this;
  }

  query(func: (q: ODataQueryOptionsHandler<T>) => void) {
    func(this.queryOptionsHandler());
    return this;
  }
  //#endregion

  //#region Requests
  protected post(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<ODataEntity<T>> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected put(
    attrs: Partial<T>,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<ODataEntity<T>> {
    return super.put(attrs, { responseType: 'entity', ...options });
  }

  protected patch(
    attrs: Partial<T>,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<ODataEntity<T>> {
    return super.patch(attrs, { responseType: 'entity', ...options });
  }

  protected delete(
    options: ODataOptions & { etag?: string } = {}
  ): Observable<any> {
    return super.delete({ responseType: 'entity', ...options });
  }

  protected get(
    options: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<ODataEntity<T>> {
    return super.get({ responseType: 'entity', ...options });
  }
  //#endregion

  //#region Shortcuts
  /**
   * Creates a new entity.
   * @param attrs The entity attributes to create.
   * @param options The options for the request.
   * @returns The created entity with the annotations.
   */
  create(
    attrs: Partial<T>,
    options?: ODataOptions
  ): Observable<ODataEntity<T>> {
    return this.post(attrs, options);
  }

  /**
   * Updates an existing entity.
   * @param attrs The entity attributes to update.
   * @param options The options for the request.
   * @returns The updated entity with the annotations.
   */
  update(
    attrs: Partial<T>,
    options?: ODataOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    return this.put(attrs, options);
  }

  /**
   * Modifies an existing entity.
   * @param attrs The entity attributes to modify.
   * @param options The options for the request.
   * @returns The modified entity with the annotations.
   */
  modify(
    attrs: Partial<T>,
    options?: ODataOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    return this.patch(attrs, options);
  }

  /**
   * Delete an existing entity.
   * @param options The options for the request.
   * @returns Observable of the deleted entity.
   */
  destroy(options?: ODataOptions & { etag?: string }): Observable<any> {
    return this.delete(options);
  }

  /**
   * Fetch an existing entity.
   * @param options The options for the request.
   * @param etag The etag to use for the request.
   * @returns Observable of the entity with the annotations.
   */
  fetch(
    options?: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntity<T>> {
    return this.get(options);
  }

  /**
   * Fetch an existing entity.
   * @param options The options for the request.
   * @param etag The etag to use for the request.
   * @returns Observable of the entity.
   */
  fetchEntity(
    options?: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<T | null> {
    return this.fetch(options).pipe(map(({ entity }) => entity));
  }

  /**
   * Fetch an existing entity and return a model.
   * @param options The options for the request.
   * @param etag The etag to use for the request.
   * @returns Observable of the entity.
   */
  fetchModel<M extends ODataModel<T>>(
    options?: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<M | null> {
    return this.fetch(options).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel<M>(entity, { annots, reset: true }) : null
      )
    );
  }
  //#endregion
}
