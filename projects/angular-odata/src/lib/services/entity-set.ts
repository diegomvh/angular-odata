import { EntityKey, ODataEntitySetResource, ODataEntityResource, HttpOptions } from '../resources';
import { ODataCollection } from '../models/collection';
import { ODataModel } from '../models/model';
import { Observable, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
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

  public fetch(key: EntityKey<T>, {etag, ...options}: {etag?: string} & HttpOptions = {}): Observable<T | null> {
    return this.entity(key)
      .get({etag, ...options})
      .pipe(map(({entity}) => entity));
  }

  public create(attrs: Partial<T>, options: HttpOptions = {}): Observable<T | null> {
    return this.entities()
      .post(attrs, options)
      .pipe(map(({entity}) => entity));
  }

  public update(key: EntityKey<T>, attrs: Partial<T>, {etag, ...options}: {etag?: string} & HttpOptions = {}): Observable<T | null> {
    etag = etag || this.api.options.helper.etag(attrs);
    const res = this.entity(key);
    if (!res.hasKey())
      return throwError("Resource without key");
    return res.put(attrs, {etag, ...options})
      .pipe(map(({entity}) => entity));
  }

  public patch(key: EntityKey<T>, attrs: Partial<T>, {etag, ...options}: {etag?: string} & HttpOptions = {}): Observable<T | null> {
    etag = etag || this.api.options.helper.etag(attrs);
    const res = this.entity(key);
    if (!res.hasKey())
      return throwError("Resource without key");
    return res.patch(attrs, {etag, ...options})
      .pipe(map(({entity}) => entity));
  }

  public destroy(key: EntityKey<T>, {etag, ...options}: {etag?: string} & HttpOptions = {}) {
    const res = this.entity(key);
    if (!res.hasKey())
      return throwError("Resource without key");
    return res.delete({etag, ...options});
  }

  // Shortcuts
  public fetchOrCreate(key: EntityKey<T>, attrs: Partial<T>, {etag, ...options}: {etag?: string} & HttpOptions = {}): Observable<T | null> {
    return this.fetch(key, {etag, ...options})
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(attrs, options);
        else
          return throwError(error);
      }));
  }

  public save(key: EntityKey<T>, attrs: Partial<T>, {etag, ...options}: {etag?: string} & HttpOptions = {}) {
    return this.entity(key).hasKey() ?
      this.update(key, attrs, {etag, ...options}) :
      this.create(attrs, options);
  }
}
