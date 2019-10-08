import { ODataClient } from '../client';
import { ODataModel, ODataCollection } from '../odata-model';
import { Injectable } from '@angular/core';
import { PlainObject, ODataRequest } from '../odata-request';

@Injectable()
export class ODataModelService<M extends ODataModel, C extends ODataCollection<ODataModel>> {
  static set: string = "";
  static model: { new(attrs: PlainObject, query: ODataRequest): ODataModel; } = null; 
  static collection: { new(models: PlainObject[], query: ODataRequest): ODataCollection<ODataModel>; } = null; 
  
  constructor(protected client: ODataClient) {}

  model(): M {
    let Ctor = <typeof ODataModelService>this.constructor;
    let query = this.client.entitySet<M>(Ctor.set).entity();
    return new Ctor.model({}, query) as M;
  }

  collection(): C {
    let Ctor = <typeof ODataModelService>this.constructor;
    let query = this.client.entitySet<M>(Ctor.set);
    return new Ctor.collection([], query) as C;
  }
}
