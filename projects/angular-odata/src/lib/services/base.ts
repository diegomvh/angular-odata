import { ODataEntitySetResource, ODataEntityResource } from '../resources';
import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataEntityConfig, ODataModel, ODataCollection } from '../models';

export class ODataBaseService<T> {
  static path: string = "";
  static type: string = "";
  static entityType: string = "";

  constructor(protected client: ODataClient) { }
  public entities(): ODataEntitySetResource<T> {
    let Ctor = <typeof ODataBaseService>this.constructor;
    return this.client.entitySet<T>(Ctor.path, Ctor.entityType);
  }

  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities()
      .entity(key);
  }

  public model<M extends ODataModel<T>>(entity?: Partial<T>): M {
    return this.entity(entity).toModel<M>(entity);
  }

  public collection<C extends ODataCollection<T, ODataModel<T>>>(entities?: Partial<T>[]): C {
    return this.entities().toCollection<C>(entities);
  }

  // Models
  public attach<M extends ODataModel<T>>(value: M): M;
  public attach<C extends ODataCollection<T, ODataModel<T>>>(value: C): C;
  public attach(value: any): any {
    if (value instanceof ODataModel) {
      return value.attach(this.entities().entity(value.toEntity()));
    } else if (value instanceof ODataCollection) {
      return value.attach(this.entities());
    }
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
    return this.client.entityConfigForType(Ctor.entityType) as ODataEntityConfig<T>;
  }
}
