import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ModelInterface, ODataModel } from '../../models';
import { PathSegment, QueryOption } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntity } from '../response';
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
      segments,
      query,
    }: {
      segments: ODataPathSegments;
      query?: ODataQueryOptions<E>;
    },
  ) {
    query?.keep(QueryOption.expand, QueryOption.select, QueryOption.format);
    return new ODataEntityResource<E>(api, { segments, query });
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
      ODataResource.resolveKey<T>(value, this.api.findStructuredType<T>(types[index])),
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
    const thisType = this.incomingType();
    const baseSchema = thisType !== undefined ? this.api.structuredType(thisType) : undefined;
    // Downcast
    const castSchema = baseSchema?.findChildSchema((s) => s.type() === type);
    if (castSchema !== undefined && baseSchema !== undefined && !castSchema.isSubtypeOf(baseSchema))
      throw new Error(`cast: Cannot cast to ${type}`);
    const segments = this.cloneSegments();
    segments.add(PathSegment.type, type).incomingType(type);
    return new ODataEntityResource<C>(this.api, {
      segments,
      query: this.cloneQuery<C>(),
    });
  }

  //#region Requests
  protected override post(attrs: Partial<T>, options: ODataOptions = {}): Observable<any> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected override put(attrs: Partial<T>, options: ODataOptions = {}): Observable<any> {
    return super.put(attrs, { responseType: 'entity', ...options });
  }

  protected override patch(attrs: Partial<T>, options: ODataOptions = {}): Observable<any> {
    return super.patch(attrs, { responseType: 'entity', ...options });
  }

  protected override delete(options: ODataOptions = {}): Observable<any> {
    return super.delete({ responseType: 'entity', ...options });
  }

  protected override get(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
    } = {},
  ): Observable<any> {
    return super.get({ responseType: 'entity', ...options });
  }
  //#endregion

  //#region Shortcuts
  create(attrs: Partial<T>, options?: ODataOptions): Observable<ODataEntity<T>> {
    return this.post(attrs, options);
  }

  update(attrs: Partial<T>, options?: ODataOptions): Observable<ODataEntity<T>> {
    return this.put(attrs, options);
  }

  modify(attrs: Partial<T>, options?: ODataOptions): Observable<ODataEntity<T>> {
    return this.patch(attrs, options);
  }

  destroy(options?: ODataOptions): Observable<ODataEntity<T>> {
    return this.delete(options);
  }

  fetch(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<ODataEntity<T>> {
    if (!this.hasKey()) return throwError(() => new Error('fetch: Entity resource without key'));
    return this.get(options);
  }

  fetchEntity(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<T | null> {
    return this.fetch(options).pipe(map(({ entity }) => entity));
  }

  fetchModel(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
      ModelType?: typeof ODataModel;
    },
  ): Observable<(ODataModel<T> & ModelInterface<T>) | null>;
  fetchModel<M extends ODataModel<T>>(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
      ModelType?: typeof ODataModel;
    },
  ): Observable<M | null>;
  fetchModel(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
      ModelType?: typeof ODataModel;
    },
  ) {
    return this.fetch(options).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel(entity, { annots, ModelType: options?.ModelType }) : null,
      ),
    );
  }
  //#endregion
}
