import {
  EntityKey,
  ODataEntitySetResource,
  ODataEntityResource,
  HttpOptions,
  ODataEntity,
  ODataEntities,
} from '../resources';
import { ODataCollection } from '../models/collection';
import { ODataModel } from '../models/model';
import { Observable, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { ODataEntityService } from './entity';

export class ODataEntitySetService<T> extends ODataEntityService<T> {
  public entities(): ODataEntitySetResource<T> {
    return this.client.entitySet<T>(this.name, this.apiNameOrEntityType);
  }

  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities().entity(key);
  }

  // Models
  public attach<M extends ODataModel<T>>(value: M): void;
  public attach<C extends ODataCollection<T, ODataModel<T>>>(value: C): void;
  public attach(value: any): void {
    if (value instanceof ODataModel) {
      value.resource(this.entities().entity());
    } else if (value instanceof ODataCollection) {
      value.resource(this.entities());
    }
  }

  // Service Config
  get entitySetSchema() {
    return this.api.findEntitySetByName(this.name);
  }

  public fetchAll(
    options?: HttpOptions
  ): Observable<T[]> {
    return this.entities().fetchAll(options);
  }

  public fetchMany(
    options?: HttpOptions & { withCount?: boolean }
  ): Observable<ODataEntities<T>> {
    return this.entities().fetch(options);
  }

  public fetchOne(
    key: EntityKey<T>,
    options?: HttpOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    return this.entity(key).fetch(options);
  }

  public create(
    attrs: Partial<T>,
    options?: HttpOptions
  ): Observable<ODataEntity<T>> {
    return this.entities().post(attrs, options);
  }

  public update(
    key: EntityKey<T>,
    attrs: Partial<T>,
    options?: HttpOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    const res = this.entity(key);
    if (!res.hasKey()) return throwError('Resource without key');
    return res.put(attrs, options);
  }

  public patch(
    key: EntityKey<T>,
    attrs: Partial<T>,
    options?: HttpOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    const res = this.entity(key);
    if (!res.hasKey()) return throwError('Resource without key');
    return res.patch(attrs, options);
  }

  public destroy(
    key: EntityKey<T>,
    options?: HttpOptions & { etag?: string }
  ) {
    const res = this.entity(key);
    if (!res.hasKey()) return throwError('Resource without key');
    return res.delete(options);
  }

  // Shortcuts
  public fetchOrCreate(
    key: EntityKey<T>,
    attrs: Partial<T>,
    { etag, ...options }: { etag?: string } & HttpOptions = {}
  ): Observable<ODataEntity<T>> {
    return this.fetchOne(key, { etag, ...options }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) return this.create(attrs, options);
        else return throwError(error);
      })
    );
  }

  public save(
    attrs: Partial<T>,
    {
      etag,
      method,
      ...options
    }: {
      etag?: string;
      method?: 'create' | 'update' | 'patch';
    } & HttpOptions = {}
  ) {
    let schema = this.structuredTypeSchema;
    if (method === undefined && schema !== undefined && schema.isCompoundKey())
      return throwError(
        'Composite key require a specific method, use create/update/patch'
      );
    let key = schema && schema.resolveKey(attrs);
    if (method === undefined) method = key !== undefined ? 'update' : 'create';
    if ((method === 'update' || method === 'patch') && key === undefined)
      return throwError("Can't update/patch entity without key");
    return method === 'create'
      ? this.create(attrs, options)
      : method === 'patch'
      ? this.patch(key, attrs, { etag, ...options })
      : this.update(key, attrs, { etag, ...options });
  }
}
