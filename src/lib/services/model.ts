import { ODataModel, ODataModelCollection } from '../models';
import { Injectable } from '@angular/core';
import { ODataEntitySetResource, ODataEntityResource } from '../resources';
import { ODataEntityService } from './entity';
import { EntityKey } from '../types';
import { ODataClient } from '../client';

@Injectable()
export class ODataModelService<M extends ODataModel, C extends ODataModelCollection<ODataModel>> {
  static set: string = "";
  static type: string = "";

  constructor(protected client: ODataClient) { }

  // Build requests
  public entities(): ODataEntitySetResource<any> {
    let Ctor = <typeof ODataEntityService>this.constructor;
    let query = this.client.entitySet<any>(Ctor.set, Ctor.type);
    return query;
  }

  public entity(key?: EntityKey): ODataEntityResource<any> {
    return this.entities()
      .entity(key);
  }
  
  model(attrs?: any): M {
    let Ctor = <typeof ODataModelService>this.constructor;
    let Model = this.client.modelForType(Ctor.type);
    return new Model(attrs || {}, this.entity()) as M;
  }

  collection(models?: any[]): C {
    let Ctor = <typeof ODataModelService>this.constructor;
    let Collection = this.client.collectionForType(Ctor.type);
    return new Collection(models || [], this.entities()) as C;
  }
}
