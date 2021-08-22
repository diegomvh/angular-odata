import type { ODataModel } from '../models/model';
import type { ODataSingletonResource } from '../resources';
import { ODataEntityService } from './entity';

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
}
