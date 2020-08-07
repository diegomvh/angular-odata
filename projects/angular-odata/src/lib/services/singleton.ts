import { Injectable } from '@angular/core';
import { ODataClient } from "../client";
import { ODataModel } from '../models/model';
import { ODataSingletonResource } from '../resources';
import { ODataEntityConfig } from '../configs/entity';

export class ODataSingletonService<T> {
  constructor(protected client: ODataClient, protected name: string, protected entityType?: string) { }

  public entity(): ODataSingletonResource<T> {
    return this.client.singleton(this.name, this.entityType);
  }

  public model<M extends ODataModel<T>>(entity?: Partial<T>): M {
    return this.entity().model<M>(entity);
  }

  // Models
  public attach<M extends ODataModel<T>>(value: M): M {
    return value.attach(this.entity());
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