import { ODataEntitySetResource, ODataEntityResource, HttpOptions } from '../resources';
import { EntityKey } from '../types';
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
    return this.entities()
      .entity(key);
  }

  // Models
  public attach<M extends ODataModel<T>>(value: M): M;
  public attach<C extends ODataCollection<T, ODataModel<T>>>(value: C): C;
  public attach(value: any): any {
    if (value instanceof ODataModel) {
      return value.attach(this.entities().entity());
    } else if (value instanceof ODataCollection) {
      return value.attach(this.entities());
    }
  }

  // Service Config
  get entitySetSchema() {
    return this.api.findEntitySetByName(this.name);
  }

  public create(entity: Partial<T>, options?: HttpOptions): Observable<T | null> {
    return this.entities()
      .post(entity, options)
      .pipe(map(({entity}) => entity));
  }

  public update(entity: Partial<T>, options?: HttpOptions): Observable<T | null> {
    const odata = this.api.options.helper;
    const etag = odata.etag(entity);
    const res = this.entity(entity);
    if (!res.segment.entitySet().hasKey())
      return throwError("Resource without key");
    return this.entity(entity as EntityKey<T>)
      .put(entity, Object.assign({etag}, options || {}))
      .pipe(map(({entity}) => entity));
  }

  public assign(entity: Partial<T>, attrs: Partial<T>, options?: HttpOptions): Observable<T> {
    const odata = this.api.options.helper;
    const etag = odata.etag(entity);
    const res = this.entity(entity);
    if (!res.segment.entitySet().hasKey())
      return throwError("Resource without key");
    return res.patch(attrs, Object.assign({etag}, options || {}))
      .pipe(map(({entity: newentity, meta}) => newentity ? newentity :
        Object.assign(entity, attrs, meta.annotations) as T));
  }

  public destroy(entity: Partial<T>, options?: HttpOptions) {
    const odata = this.api.options.helper;
    const etag = odata.etag(entity);
    const res = this.entity(entity);
    if (!res.segment.entitySet().hasKey())
      return throwError("Resource without key");
    return res.delete(Object.assign({etag}, options || {}));
  }

  // Shortcuts
  public fetchOrCreate(entity: Partial<T>, options?: HttpOptions): Observable<T | null> {
    return this.entity(entity).fetch(options)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity, options);
        else
          return throwError(error);
      }));
  }

  public save(entity: Partial<T>, options?: HttpOptions) {
    return this.entity(entity).segment.entitySet().hasKey() ?
      this.update(entity, options) :
      this.create(entity, options);
  }
}
