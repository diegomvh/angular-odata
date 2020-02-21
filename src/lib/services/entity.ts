import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ODataEntitySetResource, ODataEntityResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataActionResource, ODataFunctionResource, ODataReferenceResource, ODataCollectionAnnotations, ODataEntityAnnotations } from '../resources';

import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataSchema } from '../models';

@Injectable()
export class ODataEntityService<T> {
  static path: string = "";
  static type: string = "";

  constructor(protected client: ODataClient) { }

  // Build resources
  public entities(): ODataEntitySetResource<T> {
    let Ctor = <typeof ODataEntityService>this.constructor;
    return this.client.entitySet<T>(Ctor.path, Ctor.type);
  }

  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities()
      .entity(key);
  }

  public navigationProperty<P>(key: EntityKey<T>, name: string): ODataNavigationPropertyResource<P> {
    return this.entity(key).navigationProperty<P>(name);
  }

  public property<P>(key: EntityKey<T>, name: string): ODataPropertyResource<P> {
    return this.entity(key).property<P>(name);
  }

  public ref<P>(key: EntityKey<T>, name: string): ODataReferenceResource {
    return this.entity(key).navigationProperty<P>(name).reference();
  }

  public action<R>(key: EntityKey<T>, name: string, returnType?: string): ODataActionResource<R> {
    return this.entity(key).action<R>(name, returnType);
  }

  public collectionAction<R>(name: string, returnType?: string): ODataActionResource<R> {
    return this.entities().action<R>(name, returnType);
  }

  public function<R>(key: EntityKey<T>, name: string, params: any, returnType?: string): ODataFunctionResource<R> {
    let query = this.entity(key).function<R>(name, returnType);
    query.parameters(params);
    return query;
  }

  public collectionFunction<R>(name: string, params: any, returnType?: string): ODataFunctionResource<R> {
    let query = this.entities().function<R>(name, returnType);
    query.parameters(params);
    return query;
  }

  // Entity Actions
  public fetchCollection(): Observable<[T[], ODataCollectionAnnotations]> {
    return this.entities()
      .get();
  }

  public fetchAll(): Observable<T[]> {
    return this.entities()
      .all();
  }

  public fetchOne(key: EntityKey<T>): Observable<[T, ODataEntityAnnotations]> {
    return this.entity(key)
      .get();
  }

  public create(entity: T): Observable<[T, ODataEntityAnnotations]> {
    return this.entities()
      .post(entity);
  }

  public update(entity: T, etag?: string): Observable<[T, ODataEntityAnnotations]> {
    return this.entity(entity)
      .put(entity, {etag});
  }

  public assign(entity: Partial<T>, etag?: string) {
    return this.entity(entity as EntityKey<T>)
      .patch(entity, {etag});
  }

  public destroy(entity: T, etag?: string) {
    return this.entity(entity)
      .delete({etag});
  }

  // Shortcuts
  public fetchOrCreate(entity: Partial<T>): Observable<[T, ODataEntityAnnotations]> {
    return this.fetchOne(entity as EntityKey<T>)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity as T);
        else
          return throwError(error);
      }));
  }

  public save(entity: T) {
    return !this.entity(entity).hasKey() ? this.create(entity) : this.update(entity);
  }
}
