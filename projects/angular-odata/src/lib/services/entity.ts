import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { 
  HttpOptions, ODataEntity
} from '../resources';
import { EntityKey } from '../types';
import { ODataClient } from '../client';

import { ODataBaseService } from './base';
import { Types } from '../utils';

@Injectable()
export class ODataEntityService<T> extends ODataBaseService<T> {
  constructor(protected client: ODataClient) { super(client); }

  // Entity Actions
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
  public getOrCreate(entity: Partial<T>, options?: HttpOptions): Observable<ODataEntity<T>> {
    return this.entity(entity as EntityKey<T>).get(options)
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
