import { ODataEntitySetResource, ODataEntityResource, ODataSingletonResource, HttpOptions } from '../resources';
import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataCollection } from '../models/collection';
import { ODataModel } from '../models/model';
import { ODataEntityConfig } from '../configs/entity';
import { Observable, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';

export class ODataEntityService<T> {
  constructor(protected client: ODataClient, protected name: string, protected entityType?: string) { }

  public entities(): ODataEntitySetResource<T> {
    return this.client.entitySet<T>(this.name, this.entityType);
  }

  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities()
      .entity(key);
  }

  public model<M extends ODataModel<T>>(entity?: Partial<T>): M {
    return this.entity(entity).model<M>(entity);
  }

  public collection<C extends ODataCollection<T, ODataModel<T>>>(entities?: Partial<T>[]): C {
    return this.entities().collection<C>(entities);
  }

  // Models
  public attach<M extends ODataModel<T>>(value: M): M;
  public attach<C extends ODataCollection<T, ODataModel<T>>>(value: C): C;
  public attach(value: any): any {
    if (value instanceof ODataModel) {
      return value.attach(this.entities().entity(value.toEntity()));
    } else if (value instanceof ODataCollection) {
      return value.attach(this.entities());
    }
  }

  // Service Config 
  public config() {
    return this.client.apiConfigForType(this.entityType);
  }

  // Service Config 
  public serviceConfig() {
    return this.config().serviceConfigForName(this.name);
  }

  // Entity Config 
  public entityConfig() {
    return this.config().entityConfigForType(this.entityType) as ODataEntityConfig<T>;
  }

  public create(entity: Partial<T>, options?: HttpOptions): Observable<T> {
    return this.entities()
      .post(entity, options)
      .pipe(map(({entity}) => entity));
  }

  public update(entity: Partial<T>, options?: HttpOptions): Observable<T> {
    const res = this.entity(entity);
    if (res.segment.key().empty())
      return throwError("Resource without key");
    return this.entity(entity as EntityKey<T>)
      .put(entity, options)
      .pipe(map(({entity}) => entity));
  }

  public assign(entity: Partial<T>, attrs: Partial<T>, options?: HttpOptions): Observable<T> {
    const res = this.entity(entity);
    if (res.segment.key().empty())
      return throwError("Resource without key");
    return res.patch(attrs, options)
      .pipe(map(() => Object.assign(entity, attrs) as T));
  }

  public destroy(entity: Partial<T>, options?: HttpOptions) {
    const res = this.entity(entity);
    if (res.segment.key().empty())
      return throwError("Resource without key");
    return res.delete(options);
  }

  // Shortcuts
  public fetchOrCreate(entity: Partial<T>, options?: HttpOptions): Observable<T> {
    return this.entity(entity).fetch(options)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity, options);
        else
          return throwError(error);
      }));
  }

  public save(entity: Partial<T>, options?: HttpOptions) {
    return this.entity(entity).segment.key().empty() ? 
      this.create(entity, options) : 
      this.update(entity, options);
  }
}
