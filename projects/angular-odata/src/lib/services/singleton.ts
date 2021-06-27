import { ODataModel } from '../models/model';
import { ODataSingletonResource } from '../resources';
import { ODataEntityService } from './entity';

export class ODataSingletonService<T> extends ODataEntityService<T> {
  public entity(): ODataSingletonResource<T> {
    return this.client.singleton(this.name, this.apiNameOrEntityType);
  }

  // Models
  public attach<M extends ODataModel<T>>(value: M) {
    value.resource(this.entity());
  }
  // Service Config
  get singletonSchema() {
    return this.api.findEntitySetByName(this.name);
  }
}
