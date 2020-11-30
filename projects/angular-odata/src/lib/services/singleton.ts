import { ODataClient } from "../client";
import { ODataModel } from '../models/model';
import { ODataSingletonResource } from '../resources';

export class ODataSingletonService<T> {
  constructor(protected client: ODataClient, protected name: string, protected entityType?: string) { }

  public entity(): ODataSingletonResource<T> {
    return this.client.singleton(this.name, this.entityType);
  }

  // Models
  public attach<M extends ODataModel<T>>(value: M): M {
    return value.attach(this.entity());
  }

  // Service Config
  get api() {
    return this.client.apiForType(this.entityType);
  }

  // Service Config
  get entitySetSchema() {
    return this.api.entitySetByName(this.name);
  }

  // Entity Config
  get structuredSchema() {
    return this.entityType ? this.api.structuredTypeForType<T>(this.entityType) : null;
  }
}

