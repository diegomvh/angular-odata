import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { 
  HttpOptions
} from '../resources';
import { EntityKey } from '../types';
import { ODataClient } from '../client';

import { ODataBaseService } from './base';
import { Types } from '../utils';

@Injectable()
export class ODataEntityService<T> extends ODataBaseService<T> {
  constructor(protected client: ODataClient) { super(client); }

  // Entity Actions
  public all(options?: HttpOptions): Observable<T[]> {
    return this.entities()
      .all(options);
  }

  public fetch(key: EntityKey<T>, options?: HttpOptions): Observable<T> {
    return this.entity(key)
      .fetch(options);
  }

  public create(entity: Partial<T>, options?: HttpOptions): Observable<T> {
    return this.entities()
      .post(entity, options)
      .pipe(map(({entity}) => entity));
  }

  public update(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<T> {
    return this.entity(entity)
      .put(entity, options)
      .pipe(map(({entity}) => entity));
  }

  public assign(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<T> {
    return this.entity(entity as EntityKey<T>)
      .patch(entity, options)
      .pipe(map(({entity}) => entity));
  }

  public destroy(entity: T, options?: HttpOptions & { etag?: string }) {
    return this.entity(entity)
      .delete(options);
  }

  // Shortcuts
  public fetchOrCreate(entity: Partial<T>, options?: HttpOptions): Observable<T> {
    return this.fetch(entity as EntityKey<T>, options)
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
