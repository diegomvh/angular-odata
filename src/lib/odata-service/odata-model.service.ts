import { ODataModel } from '../odata-model/odata-model';
import { ODataCollection } from '../odata-model/odata-collection';
import { PlainObject } from '../odata-query/odata-query';
import { ODataEntityService } from './odata-entity.service';

export abstract class ODataModelService<T> extends ODataEntityService<T> {
  static set: string = "";
  static modelType: string = "";
  static collectionType: string = "";

  model(attrs?: Partial<T>) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.entityQuery(attrs);
    return this.context.createInstance(ctor.modelType, attrs || {}, query);
  }

  collection(models?: PlainObject[]) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.entitySetQuery();
    return this.context.createInstance(ctor.collectionType, models || [], query);
  }

  attach<T extends ODataModel | ODataCollection<ODataModel>>(model: T): T {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.entitySetQuery();
    query.entitySet(ctor.set);
    model.setQuery(query);
    return model;
  }
}
