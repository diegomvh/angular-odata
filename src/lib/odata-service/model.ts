import { Model } from '../odata-model/model';
import { PlainObject, ODataEntitySetRequest, ODataEntityRequest } from '../odata-request';

import { ODataEntityService } from './entity';
import { ODataClient } from '../client';
import { ODataContext } from '../context';

export class ODataModelService<T extends Model> extends ODataEntityService<T> {
  static entities: string = "";
  static modelType: string = "";
  static collectionType: string = "";

  constructor(protected odata: ODataClient, protected context: ODataContext) {
    super(odata);
  }

  protected resolveEntityKey(entity: Partial<T>) {
    let ctor = <typeof ODataModelService>this.constructor;
    let Ctor = this.context.getType(ctor.modelType) as typeof Model;
    return Ctor.schema.resolveKey(entity);
    throw new Error("Method not implemented.");
  }

  model(attrs?: Partial<T>) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.entity(attrs);
    return this.createInstance(ctor.modelType, attrs || {}, query);
  }

  collection(models?: PlainObject[]) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.entities();
    return this.createInstance(ctor.collectionType, models || [], query);
  }

  createInstance(type: string, value: any, query: ODataEntityRequest<T> | ODataEntitySetRequest<T>) {
    let Ctor = this.context.getType(type);
    let instance = new Ctor(value, query);
    instance.setContext(this);
    return instance;
  }
}
