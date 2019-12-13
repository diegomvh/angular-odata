import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ODataEntitySetResource, ODataEntityResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataActionResource, ODataFunctionResource, ODataReferenceResource, ODataCollectionAnnotations, ODataEntityAnnotations } from './resources';

import { ODataClient } from "./client";
import { EntityKey } from './types';
import { ODataModel, ODataModelCollection, ODataSchema } from './models';

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

  public entity(key?: EntityKey): ODataEntityResource<T> {
    return this.entities()
      .entity(key);
  }

  public navigationProperty<P>(entity: Partial<T>, name: string): ODataNavigationPropertyResource<P> {
    return this.entity(entity).navigationProperty<P>(name);
  }

  public property<P>(entity: Partial<T>, name: string): ODataPropertyResource<P> {
    return this.entity(entity).property<P>(name);
  }

  public ref<P>(entity: Partial<T>, name: string): ODataReferenceResource {
    return this.entity(entity).navigationProperty<P>(name).reference();
  }

  public action<R>(entity: Partial<T>, name: string, returnType?: string): ODataActionResource<R> {
    let parser = returnType? this.client.parserForType<R>(returnType) as ODataSchema<R> : null;
    return this.entity(entity).action<R>(name, parser);
  }

  public collectionAction<R>(name: string, returnType?: string): ODataActionResource<R> {
    let parser = returnType? this.client.parserForType<R>(returnType) as ODataSchema<R> : null;
    return this.entities().action<R>(name, parser);
  }

  public function<R>(entity: Partial<T>, name: string, params: any, returnType?: string): ODataFunctionResource<R> {
    let parser = returnType? this.client.parserForType<R>(returnType) as ODataSchema<R> : null;
    let query = this.entity(entity).function<R>(name, parser);
    query.parameters(params);
    return query;
  }

  public collectionFunction<R>(name: string, params: any, returnType?: string): ODataFunctionResource<R> {
    let parser = returnType? this.client.parserForType<R>(returnType) as ODataSchema<R> : null;
    let query = this.entities().function<R>(name, parser);
    query.parameters(params);
    return query;
  }

  // Models and Collections
  public model<M extends ODataModel>(attrs?: any): M {
    let Ctor = <typeof ODataEntityService>this.constructor;
    return this.client.modelForType<M>(
      attrs, 
      ODataEntityAnnotations.factory(attrs || {}), 
      this.entity(), 
      Ctor.type
    );
  }

  public collection<C extends ODataModelCollection<ODataModel>>(models?: any): C {
    let Ctor = <typeof ODataEntityService>this.constructor;
    return this.client.collectionForType(
      models, 
      ODataCollectionAnnotations.factory(models || {}), 
      this.entities(), 
      Ctor.type
    );
  }

  public attach(instance: ODataModel | ODataModelCollection<ODataModel>) {
    if (instance instanceof ODataModel)
      return instance.attach(this.entity());
    if (instance instanceof ODataModelCollection)
      return instance.attach(this.entities());
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

  public fetchOne(entity: Partial<T>): Observable<[T, ODataEntityAnnotations]> {
    return this.entity(entity)
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
    return this.entity(entity)
      .patch(entity, {etag});
  }

  public destroy(entity: T, etag?: string) {
    return this.entity(entity)
      .delete({etag});
  }

  // Shortcuts
  public fetchOrCreate(entity: Partial<T>): Observable<[T, ODataEntityAnnotations]> {
    return this.fetchOne(entity)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity as T);
        else
          return throwError(error);
      }));
  }

  public save(entity: T) {
    let query = this.entity(entity);
    if (query.isNew())
      return this.create(entity);
    else
      return this.update(entity);
  }
}
