import { HttpClient } from '@angular/common/http';

import { ODataContext } from '../odata-context';
import { ODataModel } from '../odata-model/odata-model';
import { ODataService } from './odata.service';
import { ODataCollection } from '../odata-model/odata-collection';

export abstract class ODataModelService<M extends ODataModel> extends ODataService {
  static model: typeof ODataModel;
  static collection: typeof ODataCollection;

  constructor(protected http: HttpClient, public context: ODataContext, public set: string) {
    super(http, context);
  }

  model(attrs?: {[name: string]: any}): M {
    let cotr = <typeof ODataModelService>this.constructor;
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return new cotr.model(attrs || {}, query) as M;
  }

  collection(attrs?: {[name: string]: any}[]): ODataCollection<M> {
    let cotr = <typeof ODataModelService>this.constructor;
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return new cotr.collection(attrs || [], query) as ODataCollection<M>;
  }

  attach<T extends ODataModel | ODataCollection<ODataModel>>(model: T): T {
    let query = this.queryBuilder();
    query.entitySet(this.set);
    model.attach(query);
    return model;
  }
}
