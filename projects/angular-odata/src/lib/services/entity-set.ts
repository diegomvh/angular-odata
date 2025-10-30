import type { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ODataCollection } from '../models/collection';
import { ODataModel } from '../models/model';
import type {
  EntityKey,
  ODataEntity,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataOptions,
} from '../resources';
import { ODataEntityService } from './entity';

export class ODataEntitySetService<T> extends ODataEntityService<T> {
  static Model?: typeof ODataModel<any>;
  static Collection?: typeof ODataCollection<any, ODataModel<any>>;

  model(entity?: Partial<T>, reset?: boolean) {
    const Service = this.constructor as typeof ODataEntitySetService<T>;
    return this.entity().asModel((entity ?? {}) as Partial<T>, {
      reset,
      ModelType: Service.Model,
    });
  }

  collection(entities?: Partial<T>[], reset?: boolean) {
    const Service = this.constructor as typeof ODataEntitySetService<T>;
    return this.entities().asCollection((entities ?? []) as Partial<T>[], {
      reset,
      CollectionType: Service.Collection,
    });
  }

  /**
   * Get the entity set resource for this service.
   */
  public entities(): ODataEntitySetResource<T> {
    return this.client.entitySet<T>(this.name, this.apiNameOrEntityType);
  }

  /**
   * Get the entity resource for this service.
   * @param key The entity key.
   */
  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities().entity(key);
  }

  /**
   * Attach an existing model to this service.
   * @param model The model to attach.
   */
  public attach<M extends ODataModel<T>>(model: M): void;
  public attach<C extends ODataCollection<T, ODataModel<T>>>(model: C): void;
  public attach(model: ODataModel<T> | ODataCollection<T, ODataModel<T>>): void {
    if (model instanceof ODataModel) {
      model.attach(this.entities().entity());
    } else if (model instanceof ODataCollection) {
      model.attach(this.entities());
    }
  }

  /**
   * The schema for the entity set.
   */
  get entitySetSchema() {
    return this.api.findEntitySet(this.name);
  }

  /**
   * Get all entities from the entity set.
   * @param options The options for the request.
   */
  public fetchAll(options?: ODataOptions) {
    return this.entities().fetchAll(options);
  }

  /**
   * Get entities from the entity set.
   * @param withCount Get the count of the entities.
   * @param options The options for the request.
   */
  public fetchMany(top: number, options?: ODataOptions & { withCount?: boolean }) {
    return this.entities().fetchMany(top, options);
  }

  /**
   * Get an entity from the entity set.
   * @param key The entity key.
   * @param etag The etag for the entity.
   * @param options The options for the request.
   */
  public fetchOne(options?: ODataOptions & { etag?: string }) {
    return this.entities().fetchOne(options);
  }

  /**
   * Create an entity in the entity set.
   * @param attrs The attributes for the entity.
   * @param options The options for the request.
   */
  public create(attrs: Partial<T>, options?: ODataOptions): Observable<ODataEntity<T>> {
    return this.entities().create(attrs, options);
  }

  /**
   * Update an entity in the entity set.
   * @param key The entity key.
   * @param attrs The attributes for the entity.
   * @param etag The etag for the entity.
   * @param options The options for the request.
   */
  public update(
    key: EntityKey<T>,
    attrs: Partial<T>,
    options?: ODataOptions & { etag?: string },
  ): Observable<ODataEntity<T>> {
    const res = this.entity(key);
    if (!res.hasKey()) return throwError(() => new Error('update: Resource without key'));
    return res.update(attrs, options);
  }

  /**
   * Patch an entity in the entity set.
   * @param key The entity key.
   * @param attrs The attributes for the entity.
   * @param etag The etag for the entity.
   * @param options The options for the request.
   */
  public modify(
    key: EntityKey<T>,
    attrs: Partial<T>,
    options?: ODataOptions & { etag?: string },
  ): Observable<ODataEntity<T>> {
    const res = this.entity(key);
    if (!res.hasKey()) return throwError(() => new Error('modify: Resource without key'));
    return res.modify(attrs, options);
  }

  /**
   * Delete an entity in the entity set.
   * @param key The entity key.
   * @param etag The etag for the entity.
   * @param options The options for the request.
   */
  public destroy(key: EntityKey<T>, options?: ODataOptions & { etag?: string }) {
    const res = this.entity(key);
    if (!res.hasKey()) return throwError(() => new Error('destroy: Resource without key'));
    return res.destroy(options);
  }

  //#region Shortcuts
  /**
   * Get or create an entity in the entity set.
   * @param key The entity key.
   * @param attrs The attributes for the entity.
   * @param etag The etag for the entity.
   * @param options The options for the request.
   */
  public fetchOrCreate(
    key: EntityKey<T>,
    attrs: Partial<T>,
    { etag, ...options }: { etag?: string } & ODataOptions = {},
  ): Observable<ODataEntity<T>> {
    return this.entity(key)
      .fetch({ etag, ...options })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) return this.create(attrs, options);
          else return throwError(() => error);
        }),
      );
  }

  /**
   * Save an entity in the entity set.
   * @param attrs The attributes for the entity.
   * @param method The method to use.
   * @param etag The etag for the entity.
   * @param options The options for the request.
   */
  public save(
    attrs: Partial<T>,
    {
      etag,
      method,
      ...options
    }: {
      etag?: string;
      method?: 'create' | 'update' | 'modify';
    } & ODataOptions = {},
  ) {
    let schema = this.structuredTypeSchema;
    if (method === undefined && schema !== undefined && schema.isCompoundKey())
      return throwError(
        () => new Error('save: Composite key require a specific method, use create/update/patch'),
      );
    let key = schema && schema.resolveKey(attrs);
    if (method === undefined) method = key !== undefined ? 'update' : 'create';
    if ((method === 'update' || method === 'modify') && key === undefined)
      return throwError(() => new Error("save: Can't update/patch entity without key"));
    return method === 'create'
      ? this.create(attrs, options)
      : method === 'modify'
        ? this.modify(key, attrs, { etag, ...options })
        : this.update(key, attrs, { etag, ...options });
  }
  //#endregion
}
