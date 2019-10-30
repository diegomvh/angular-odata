import { ODataClient } from '../client';
import { Model, ModelCollection } from '../models';
import { Injectable } from '@angular/core';

@Injectable()
export class ODataModelService<T, M extends Model<T>, C extends ModelCollection<T, Model<T>>> {
  static set: string = "";
  static type: string = "";
  static model: string = "";
  static collection: string = ""; 
  
  constructor(protected client: ODataClient) { }

  model(attrs?: T): M {
    let Ctor = <typeof ODataModelService>this.constructor;
    let query = this.client.entitySet<T>(Ctor.set, Ctor.type).entity();
    let Model = this.client.modelForType(Ctor.model);
    return new Model(attrs || {}, query) as M;
  }

  collection(models?: T[]): C {
    let Ctor = <typeof ODataModelService>this.constructor;
    let query = this.client.entitySet<T>(Ctor.set, Ctor.type);
    let Collection = this.client.collectionForType(Ctor.model);
    return new Collection(models || [], query) as C;
  }
}
