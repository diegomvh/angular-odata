import { PlainObject, ODataEntitySetRequest, ODataEntityRequest } from '../odata-request';

import { ODataClient } from '../client';
import { ODataContext } from '../context';
import { Model, Collection } from '../odata-model';

export class ODataModelService {
  static modelType: string = "";
  static collectionType: string = "";

  constructor(protected odata: ODataClient, protected context: ODataContext) { }

  model(type: string): typeof Model {
    return this.context.getModel(type);
  }

  collection(type: string): typeof Collection {
    return this.context.getCollection(type);
  }

  createInstance(type: string, value: any) {
    let Ctor = this.context.getType(type);
    let instance = new Ctor(value);
    instance.setService(this);
    return instance;
  }
}
