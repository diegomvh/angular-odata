import { ODataClient } from '../client';
import { ODataModel, ODataCollection } from '../odata-model';
import { Injectable } from '@angular/core';
import { PlainObject } from '../odata-request';

@Injectable()
export class ODataModelService<M extends ODataModel, C extends ODataCollection<ODataModel>> {
  static set: string = "";
  static model: { new(attrs: PlainObject): ODataModel; } = null; 
  static collection: { new(models: PlainObject[]): ODataCollection<ODataModel>; } = null; 
  
  constructor(protected odata: ODataClient) {
    var Ctor = <typeof ODataModelService>this.constructor;
    (Ctor.model as typeof ODataModel).query = this.odata.entitySet<M>(Ctor.set).entity();
    (Ctor.collection as typeof ODataCollection).query = this.odata.entitySet<M>(Ctor.set);
  }

  model(): M {
    var Ctor = <typeof ODataModelService>this.constructor;
    return new Ctor.model({}) as M;
  }

  collection(): C {
    var Ctor = <typeof ODataModelService>this.constructor;
    return new Ctor.collection([]) as C;
  }
}
