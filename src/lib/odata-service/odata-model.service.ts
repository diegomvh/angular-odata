import { HttpClient } from '@angular/common/http';

import { ODataContext } from '../odata-context';
import { ODataModel } from '../odata-model/odata-model';
import { ODataService } from './odata.service';
import { ODataCollection } from '../odata-model/odata-collection';

export abstract class ODataModelService<M extends ODataModel> extends ODataService {
  static model: string = null;
  static collection: string = null;

  constructor(protected http: HttpClient, public context: ODataContext, public set: string) {
    super(http, context);
  }

  model(attrs?: {[name: string]: any}): M {
    let cotr = <typeof ODataModelService>this.constructor;
    let Model = this.context.getModel(cotr.model);
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return new Model(attrs || {}, query) as M;
  }

  collection(attrs?: {[name: string]: any}[]): ODataCollection<M> {
    let cotr = <typeof ODataModelService>this.constructor;
    let Collection = this.context.getCollection(cotr.collection);
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return new Collection(attrs || [], query) as ODataCollection<M>;
  }
}
