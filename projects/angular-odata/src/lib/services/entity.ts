import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { 
  ODataEntitiesAnnotations, 
  ODataEntityAnnotations, 
  HttpOptions
} from '../resources';
import { EntityKey } from '../types';
import { ODataClient } from '../client';

import { ODataBaseService } from './base';
import { Types } from '../utils';
import { ODataEntities, ODataEntity } from '../resources/responses/response';

@Injectable()
export class ODataEntityService<T> extends ODataBaseService<T> {
  constructor(protected client: ODataClient) { super(client); }

  // Entity Actions
  public fetchCollection(options?: HttpOptions): Observable<ODataEntities<T>> {
    return this.entities()
      .get(options);
  }

  public fetchAll(options?: HttpOptions): Observable<T[]> {
    return this.entities()
      .all(options);
  }

  public fetchOne(key: EntityKey<T>, options?: HttpOptions): Observable<ODataEntity<T>> {
    return this.entity(key)
      .get(options);
  }

  public create(entity: Partial<T>, options?: HttpOptions): Observable<ODataEntity<T>> {
    return this.entities()
      .post(entity, options);
  }

  public update(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<ODataEntity<T>> {
    return this.entity(entity)
      .put(entity, options);
  }

  public assign(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<ODataEntity<T>> {
    return this.entity(entity as EntityKey<T>)
      .patch(entity, options);
  }

  public destroy(entity: T, options?: HttpOptions & { etag?: string }) {
    return this.entity(entity)
      .delete(options);
  }

  // Shortcuts
  public fetchOrCreate(entity: Partial<T>, options?: HttpOptions): Observable<ODataEntity<T>> {
    return this.fetchOne(entity as EntityKey<T>, options)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity as T, options);
        else
          return throwError(error);
      }));
  }

  public save(entity: Partial<T>, options?: HttpOptions & {etag?: string}) {
    return Types.isUndefined(this.entity(entity).segment.key()) ? this.create(entity, options) : this.update(entity, options);
  }
}
