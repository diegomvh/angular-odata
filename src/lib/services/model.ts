import { ODataClient } from '../client';
import { Model, ModelCollection } from '../models';
import { Injectable } from '@angular/core';
import { ODataResource } from '../resources';
import { ODataSettings } from '../settings';
import { PlainObject } from '../types';

@Injectable()
export class ODataModelService<M extends Model, C extends ModelCollection<Model>> {
  static set: string = "";
  static model: { new(attrs: PlainObject, query: ODataResource<any>): Model; } = null; 
  static collection: { new(models: PlainObject[], query: ODataResource<any>): ModelCollection<Model>; } = null; 
  
  constructor(protected client: ODataClient, protected settings: ODataSettings) { }

  model(attrs?: PlainObject): M {
    let Ctor = <typeof ODataModelService>this.constructor;
    let query = this.client.entitySet<M>(Ctor.set).entity();
    return new Ctor.model(attrs || {}, query) as M;
  }

  collection(models?: PlainObject[]): C {
    let Ctor = <typeof ODataModelService>this.constructor;
    let query = this.client.entitySet<M>(Ctor.set);
    return new Ctor.collection(models || [], query) as C;
  }
}
