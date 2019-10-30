import { Model, ModelCollection } from '../models';
import { Injectable } from '@angular/core';
import { ODataEntityService } from './entity';

@Injectable()
export class ODataModelService<T, M extends Model<T>, C extends ModelCollection<T, Model<T>>> extends ODataEntityService<T> {
  static set: string = "";
  static type: string = "";
  static model: string = "";
  static collection: string = ""; 
  
  model(attrs?: T): M {
    let Ctor = <typeof ODataModelService>this.constructor;
    let Model = this.client.modelForType(Ctor.model);
    return new Model(attrs || {}, this.entity()) as M;
  }

  collection(models?: T[]): C {
    let Ctor = <typeof ODataModelService>this.constructor;
    let Collection = this.client.collectionForType(Ctor.collection);
    return new Collection(models || [], this.entities()) as C;
  }
}
