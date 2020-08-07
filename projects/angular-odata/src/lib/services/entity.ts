import { Injectable } from '@angular/core';
import { ODataEntitySetResource, ODataEntityResource, ODataSingletonResource } from '../resources';
import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataCollection } from '../models/collection';
import { ODataModel } from '../models/model';
import { ODataEntityConfig } from '../configs/entity';

export class ODataEntityService<T> {
  constructor(protected client: ODataClient, protected name: string, protected entityType?: string) { }

  public entities(): ODataEntitySetResource<T> {
    return this.client.entitySet<T>(this.name, this.entityType);
  }

  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities()
      .entity(key);
  }

  public model<M extends ODataModel<T>>(entity?: Partial<T>): M {
    return this.entity(entity).model<M>(entity);
  }

  public collection<C extends ODataCollection<T, ODataModel<T>>>(entities?: Partial<T>[]): C {
    return this.entities().collection<C>(entities);
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
    return this.client.apiConfigForType(this.entityType);
  }

  // Service Config 
  public serviceConfig() {
    return this.config().serviceConfigForName(this.name);
  }

  // Entity Config 
  public entityConfig() {
    return this.config().entityConfigForType(this.entityType) as ODataEntityConfig<T>;
  }
}
