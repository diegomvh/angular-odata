import { ODataResource } from '../resources';
import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataModel } from '../models/model';

export abstract class ODataEntityService<T> {
  constructor(protected client: ODataClient, protected name: string, protected apiNameOrEntityType?: string) { }

  public abstract entity(key?: EntityKey<T>): ODataResource<T>;
  public abstract attach<M extends ODataModel<T>>(value: M): void;

  // Api Config
  get api() {
    return this.client.apiFor(this.apiNameOrEntityType);
  }

  // Entity Config
  get structuredTypeSchema() {
    return this.apiNameOrEntityType !== undefined ?
      this.api.findStructuredTypeForType<T>(this.apiNameOrEntityType) :
      undefined;
  }
}
