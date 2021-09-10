import { Observable } from 'rxjs';
import type { ODataModel } from '../models/model';
import type {
  HttpOptions,
  ODataEntity,
  ODataSingletonResource,
} from '../resources';
import { ODataEntityService } from './entity';

/**
 * OData Singleton Service
 * www.odata.org/getting-started/advanced-tutorial/#singleton
 */
export class ODataSingletonService<T> extends ODataEntityService<T> {
  /**
   * Get the entity resource for this service.
   * @param key The entity key.
   */
  public entity(): ODataSingletonResource<T> {
    return this.client.singleton(this.name, this.apiNameOrEntityType);
  }

  /**
   * Attach an existing model to this service.
   * @param model The model to attach.
   */
  public attach<M extends ODataModel<T>>(model: M) {
    model.attach(this.entity());
  }

  // Service Config
  get singletonSchema() {
    return this.api.findEntitySetByName(this.name);
  }

  /**
   * Update the singleton entity
   * @param attrs The attributes for the entity.
   * @param etag The etag for the entity.
   * @param options The options for the request.
   */
  public update(
    attrs: Partial<T>,
    options?: HttpOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    const res = this.entity();
    return res.put(attrs, options);
  }

  /**
   * Patch the singleton entity
   * @param attrs The attributes for the entity.
   * @param etag The etag for the entity.
   * @param options The options for the request.
   */
  public patch(
    attrs: Partial<T>,
    options?: HttpOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    const res = this.entity();
    return res.patch(attrs, options);
  }
}
