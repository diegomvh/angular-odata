import { ODataModel, Model } from '../odata-model/odata-model';
import { ODataCollection } from '../odata-model/odata-collection';
import { PlainObject } from '../odata-query/odata-query';
import { ODataEntityService } from './odata-entity.service';

export abstract class ODataModelService<T extends Model> extends ODataEntityService<T> {
  static set: string = "";
  static modelType: string = "";
  static collectionType: string = "";

  model(attrs?: Partial<T>) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.entity(attrs);
    return this.context.createInstance(ctor.modelType, attrs || {}, query);
  }

  collection(models?: PlainObject[]) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.set();
    return this.context.createInstance(ctor.collectionType, models || [], query);
  }

  attach<T extends ODataModel | ODataCollection<ODataModel>>(model: T): T {
    let query = this.entity();
    model.setQuery(query);
    return model;
  }
}
