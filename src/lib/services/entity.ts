import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, NEVER } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ODataNavigationPropertyResource, ODataPropertyResource, ODataActionResource, ODataFunctionResource, ODataReferenceResource, ODataCollectionAnnotations, ODataEntityAnnotations, HttpOptions, ODataPropertyAnnotations } from '../resources';

import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataBaseService } from './base';
import { ODataCallableResource } from '../resources/requests/callable';

@Injectable()
export class ODataEntityService<T> extends ODataBaseService<T> {
  constructor(protected client: ODataClient) { super(client); }

  public navigationProperty<P>(key: EntityKey<T>, name: string): ODataNavigationPropertyResource<P> {
    return this.entity(key).navigationProperty<P>(name);
  }

  public property<P>(key: EntityKey<T>, name: string): ODataPropertyResource<P> {
    return this.entity(key).property<P>(name);
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

  // Callable
  protected call<R>(
    callable: ODataCallableResource<R>, 
    args: any | null, 
    responseType: 'property', 
    options?: HttpOptions
  ): Observable<[R, ODataPropertyAnnotations]>;

  protected call<R>(
    callable: ODataCallableResource<R>, 
    args: any | null, 
    responseType: 'entity', 
    options?: HttpOptions
  ): Observable<[R, ODataEntityAnnotations]>;

  protected call<R>(
    callable: ODataCallableResource<R>, 
    args: any | null, 
    responseType: 'entities', 
    options?: HttpOptions
  ): Observable<[R[], ODataCollectionAnnotations]>;

  protected call(
    callable: ODataCallableResource<any>, 
    args: any | null, 
    responseType: 'property' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any> {
    let ops = Object.assign<any, HttpOptions>({ responseType }, options || {});
    if (callable instanceof ODataFunctionResource) {
      if (args)
        callable.parameters(args);
      return callable.get(ops) as Observable<any>;
    } else if (callable instanceof ODataActionResource) {
      return callable.post(args, ops) as Observable<any>;
    } else {
      throw new Error(`Can't call resource`);
    }
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
    return this.entity(entity).hasKey() ? this.update(entity) : this.create(entity);
  }
}
