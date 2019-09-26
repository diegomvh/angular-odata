import { Model } from '../odata-model/model';
import { PlainObject, ODataEntitySetRequest, ODataEntityRequest } from '../odata-request';

import { ODataClient } from '../client';
import { ODataContext } from '../context';

export class ODataModelService<T extends Model> {
  static set: string = "";
  static modelType: string = "";
  static collectionType: string = "";

  constructor(protected odata: ODataClient, protected context: ODataContext) { }

  protected resolveEntityKey(model: T) {
    return model.resolveKey();
  }

  model(attrs?: PlainObject) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.odata.entitySet<T>(ctor.set).entity();
    return this.createInstance(ctor.modelType, attrs || {}, query);
  }

  collection(models?: PlainObject[]) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.odata.entitySet<T>(ctor.set);
    return this.createInstance(ctor.collectionType, models || [], query);
  }

  createInstance(type: string, value: any, query: ODataEntityRequest<T> | ODataEntitySetRequest<T>) {
    let Ctor = this.context.getType(type);
    let instance = new Ctor(value, query);
    instance.setService(this);
    return instance;
  }
}
