import { ODataEntitySetResource, ODataEntityResource } from '../resources';
import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataEntityConfig } from '../models';

export class ODataBaseService<T> {
  static path: string = "";
  static type: string = "";
  static entity: string = "";

  constructor(protected client: ODataClient) { }

  // Build resources
  public entities(): ODataEntitySetResource<T> {
    let Ctor = <typeof ODataBaseService>this.constructor;
    return this.client.entitySet<T>(Ctor.path, Ctor.entity);
  }

  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities()
      .entity(key);
  }

  // Service Config 
  public config() {
    let Ctor = <typeof ODataBaseService>this.constructor;
    return this.client.configForType(Ctor.type);
  }

  // Service Config 
  public serviceConfig() {
    let Ctor = <typeof ODataBaseService>this.constructor;
    return this.client.serviceConfigForType(Ctor.type);
  }

  // Entity Config 
  public entityConfig() {
    let Ctor = <typeof ODataBaseService>this.constructor;
    return this.client.entityConfigForType(Ctor.entity) as ODataEntityConfig<T>;
  }
}
