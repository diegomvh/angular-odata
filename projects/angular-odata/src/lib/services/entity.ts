import { EntityKey, ODataResource } from '../resources';

import { ODataBaseService } from './base';
import { ODataModel } from '../models/model';

export abstract class ODataEntityService<T> extends ODataBaseService {
  public abstract entity(key?: EntityKey<T>): ODataResource<T>;
  public abstract attach<M extends ODataModel<T>>(value: M): void;

  // Entity Config
  get structuredTypeSchema() {
    return this.apiNameOrEntityType !== undefined
      ? this.api.findStructuredTypeForType<T>(this.apiNameOrEntityType)
      : undefined;
  }
}
