import { ODataModel } from '../models/model';
import { EntityKey, ODataResource } from '../resources';
import { ODataBaseService } from './base';

export abstract class ODataEntityService<T> extends ODataBaseService {
  public abstract entity(key?: EntityKey<T>): ODataResource<T>;
  public abstract attach<M extends ODataModel<T>>(value: M): void;

  /**
   * The schema for the structured type.
   */
  get structuredTypeSchema() {
    return this.apiNameOrEntityType !== undefined
      ? this.api.findStructuredType<T>(this.apiNameOrEntityType)
      : undefined;
  }
}
