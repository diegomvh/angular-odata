import { Model } from '../odata-model/odata-model';
import { ODataEntityService } from './odata-entity.service';
import { PlainObject } from '../odata-request';

export abstract class ODataModelService<T extends Model> extends ODataEntityService<T> {
  static entities: string = "";
  static modelType: string = "";
  static collectionType: string = "";

  model(attrs?: Partial<T>) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.entity(attrs);
    return this.context.createInstance(ctor.modelType, attrs || {}, query);
  }

  collection(models?: PlainObject[]) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.entities();
    return this.context.createInstance(ctor.collectionType, models || [], query);
  }
}
