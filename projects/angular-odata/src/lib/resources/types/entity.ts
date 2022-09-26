import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataModel } from '../../models';
import { ODataStructuredType } from '../../schema/structured-type';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataResponse } from '../responses';
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
    {
      schema,
      segments,
      query,
    }: {
      schema?: ODataStructuredType<E>;
      segments: ODataPathSegments;
      query?: ODataQueryOptions<E>;
    }
  ) {
    query?.keep(
      QueryOptionNames.expand,
      QueryOptionNames.select,
      QueryOptionNames.format
    );
    return new ODataEntityResource<E>(api, { segments, query, schema });
  }
  override clone(): ODataEntityResource<T> {
    return super.clone() as ODataEntityResource<T>;
  }
  //#endregion

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
    return ODataMediaResource.factory<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
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

  cast<C>(type: string) {
    const baseSchema = this.schema as ODataStructuredType<T>;
    const castSchema = this.api.findStructuredTypeForType<C>(type);
    if (
      castSchema !== undefined &&
      baseSchema !== undefined &&
      !castSchema.isSubtypeOf(baseSchema)
    )
      throw new Error(`cast: Cannot cast to ${type}`);
    const segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataEntityResource<C>(this.api, {
      segments,
      schema: castSchema,
      query: this.cloneQuery<C>(),
    });
  }

  //#region Requests
  protected override post(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<any> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected override put(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<any> {
    return super.put(attrs, { responseType: 'entity', ...options });
  }

  protected override patch(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<any> {
    return super.patch(attrs, { responseType: 'entity', ...options });
  }

  protected override delete(options: ODataOptions = {}): Observable<any> {
    return super.delete({ responseType: 'entity', ...options });
  }

  protected override get(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<any> {
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
    options?: ODataOptions
  ): Observable<ODataEntity<T>> {
    return this.put(attrs, options);
  }

  modify(
    attrs: Partial<T>,
    options?: ODataOptions
  ): Observable<ODataEntity<T>> {
    return this.patch(attrs, options);
  }

  destroy(options?: ODataOptions): Observable<any> {
    return this.delete(options);
  }

  fetch(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntity<T>> {
    if (!this.hasKey())
      return throwError(() => new Error('fetch: Entity resource without key'));
    return this.get(options);
  }

  fetchEntity(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<T | null> {
    return this.fetch(options).pipe(map(({ entity }) => entity));
  }

  fetchModel<M extends ODataModel<T>>(
    options?: ODataOptions & {
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
