import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { 
  ODataNavigationPropertyResource, 
  ODataPropertyResource, 
  ODataActionResource, 
  ODataFunctionResource, 
  ODataEntitiesAnnotations, 
  ODataEntityAnnotations, 
  HttpOptions
} from '../resources';
import { EntityKey } from '../types';
import { ODataClient } from '../client';

import { ODataBaseService } from './base';

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

  public function<R>(key: EntityKey<T>, name: string, returnType?: string): ODataFunctionResource<R> {
    return this.entity(key).function<R>(name, returnType);
  }

  public collectionFunction<R>(name: string, returnType?: string): ODataFunctionResource<R> {
    return this.entities().function<R>(name, returnType);
  }

  // Entity Actions
  public fetchCollection(options?: HttpOptions): Observable<[T[], ODataEntitiesAnnotations]> {
    return this.entities()
      .get(options);
  }

  public fetchAll(options?: HttpOptions): Observable<T[]> {
    return this.entities()
      .all(options);
  }

  public fetchOne(key: EntityKey<T>, options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return this.entity(key)
      .get(options);
  }

  public create(entity: Partial<T>, options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return this.entities()
      .post(entity, options);
  }

  public update(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<[T, ODataEntityAnnotations]> {
    return this.entity(entity)
      .put(entity, options);
  }

  public assign(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<[T, ODataEntityAnnotations]> {
    return this.entity(entity as EntityKey<T>)
      .patch(entity, options);
  }

  public destroy(entity: T, options?: HttpOptions & { etag?: string }) {
    return this.entity(entity)
      .delete(options);
  }

  // Shortcuts
  public fetchOrCreate(entity: Partial<T>, options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return this.fetchOne(entity as EntityKey<T>, options)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity as T, options);
        else
          return throwError(error);
      }));
  }

  public save(entity: Partial<T>, options?: HttpOptions & {etag?: string}) {
    return this.entity(entity).hasKey() ? this.update(entity, options) : this.create(entity, options);
  }
}
