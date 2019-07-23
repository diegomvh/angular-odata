import { HttpClient } from '@angular/common/http';

import { ODataContext } from '../odata-context';
import { ODataEntityService } from './odata-entity.service';
import { ODataModel } from '../odata-model/odata-model';
import { ODataCollection } from '../odata-model/odata-collection';

export abstract class ODataModelService<M extends ODataModel, C extends ODataCollection<ODataModel>> extends ODataEntityService<M> {
  static model: string = null;
  static collection: string = null;

  constructor(protected http: HttpClient, public context: ODataContext, public set: string) {
    super(http, context, set);
  }

  model(attrs: any): M {
    let cotr = <typeof ODataModelService>this.constructor;
    let Model = this.context.getModel(cotr.model);
    return new Model(attrs, this) as M;
  }

  collection(attrs: any): C {
    let cotr = <typeof ODataModelService>this.constructor;
    let Collection = this.context.getCollection(cotr.collection);
    return new Collection(attrs, this) as C;
  }
}
