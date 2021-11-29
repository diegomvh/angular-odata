import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataModel } from '../../models';
import { ODataStructuredTypeParser } from '../../schema';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntity } from '../responses/types';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataMediaResource } from './media';
import { ODataNavigationPropertyResource } from './navigation-property';
import { ODataOptions } from './options';
import { ODataPropertyResource } from './property';

export class ODataEntityResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(
    api: ODataApi,
    segments: ODataPathSegments,
    options: ODataQueryOptions<E>
  ) {
    options.keep(
      QueryOptionNames.expand,
      QueryOptionNames.select,
      QueryOptionNames.format
    );
    return new ODataEntityResource<E>(api, segments, options);
  }

  clone() {
    return new ODataEntityResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery<T>()
    );
  }
  //#endregion

  schema() {
    let type = this.type();
    return type !== undefined
      ? this.api.findStructuredTypeForType<T>(type)
      : undefined;
  }

  key(value: any) {
    const entity = this.clone();
    var key = this.resolveKey(value);
    if (key !== undefined) entity.segment((s) => s.entitySet().key(key));
    return entity;
  }

  keys(values: any[]) {
    const entity = this.clone();
    const types = this.pathSegments.types({ key: true });
    const keys = values.map((value, index) =>
      ODataResource.resolveKey(
        value,
        this.api.findStructuredTypeForType<T>(types[index])
      )
    );
    entity.segment((s) => s.keys(keys));
    return entity;
  }

  media() {
    return ODataMediaResource.factory<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery<T>()
    );
  }

  navigationProperty<N>(path: string) {
    return ODataNavigationPropertyResource.fromResource<N>(this, path);
  }

  property<P>(path: string) {
    return ODataPropertyResource.fromResource<P>(this, path);
  }

  action<P, R>(path: string) {
    return ODataActionResource.fromResource<P, R>(this, path);
  }

  function<P, R>(path: string) {
    return ODataFunctionResource.fromResource<P, R>(this, path);
  }

  //TODO: Check
  cast<C>(type: string) {
    let segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataEntityResource<C>(this.api, segments, this.cloneQuery<C>());
  }

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
  create(
    attrs: Partial<T>,
    options?: ODataOptions
  ): Observable<ODataEntity<T>> {
    return this.post(attrs, options);
  }

  update(
    attrs: Partial<T>,
    options?: ODataOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    return this.put(attrs, options);
  }

  modify(
    attrs: Partial<T>,
    options?: ODataOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    return this.patch(attrs, options);
  }

  destroy(options?: ODataOptions & { etag?: string }): Observable<any> {
    return this.delete(options);
  }

  fetch(
    options?: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntity<T>> {
    if (!this.hasKey()) return throwError('Entity resource without key');
    return this.get(options);
  }

  fetchEntity(
    options?: ODataOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<T | null> {
    return this.fetch(options).pipe(map(({ entity }) => entity));
  }

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
