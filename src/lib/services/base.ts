import { ODataEntitySetResource, ODataEntityResource } from '../resources';
import { ODataClient } from "../client";
import { EntityKey } from '../types';

export class ODataBaseService<T> {
  static path: string = "";
  static type: string = "";

  constructor(protected client: ODataClient) { }

  // Build resources
  public entities(): ODataEntitySetResource<T> {
    let Ctor = <typeof ODataBaseService>this.constructor;
    return this.client.entitySet<T>(Ctor.path, Ctor.type);
  }

  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities()
      .entity(key);
  }

  // Get base type data
  public meta() {
    let Ctor = <typeof ODataBaseService>this.constructor;
    return this.client.metaForType<T>(Ctor.type);
  }
}
