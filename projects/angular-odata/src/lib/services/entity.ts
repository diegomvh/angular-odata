import { ODataResource } from '../resources';
import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataModel } from '../models/model';

export abstract class ODataEntityService<T> {
  constructor(protected client: ODataClient, protected name: string, protected apiNameOrEntityType?: string) { }

  public abstract entity(key?: EntityKey<T>): ODataResource<T>;
  // Models
  public attach<M extends ODataModel<T>>(value: M): M {
    return value.attach(this.entity());
  }

  // Api Config
  get api() {
    return this.client.apiFor(this.apiNameOrEntityType);
  }

  // Entity Config
  get structuredTypeSchema() {
    if (this.apiNameOrEntityType === undefined)
      return null;
    return this.api.findStructuredTypeForType<T>(this.apiNameOrEntityType) || null;
  }
}
