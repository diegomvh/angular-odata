import { ODataModel } from '../odata-model/odata-model';
import { ODataCollection } from '../odata-model/odata-collection';
import { PlainObject } from '../odata-query/odata-query-builder';
import { ODataService } from './odata.service';

export abstract class ODataModelService<T> extends ODataService {
  static set: string = "";
  static modelType: string = "";
  static collectionType: string = "";

  model(attrs?: PlainObject) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.queryBuilder();
    query.entitySet(ctor.set);
    return this.context.createInstance(ctor.modelType, attrs || {}, query);
  }

  collection(models?: PlainObject[]) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.queryBuilder();
    query.entitySet(ctor.set);
    return this.context.createInstance(ctor.collectionType, models || [], query);
  }

  attach<T extends ODataModel | ODataCollection<ODataModel>>(model: T): T {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.queryBuilder();
    query.entitySet(ctor.set);
    model.setQuery(query);
    return model;
  }
}
