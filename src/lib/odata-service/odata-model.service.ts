import { HttpClient } from '@angular/common/http';

import { ODataContext } from '../odata-context';
import { ODataModel } from '../odata-model/odata-model';
import { ODataService } from './odata.service';
import { ODataCollection } from '../odata-model/odata-collection';

export abstract class ODataModelService extends ODataService {
  static model: typeof ODataModel = null;
  static collection: typeof ODataCollection = null;

  constructor(protected http: HttpClient, public context: ODataContext, public set: string) {
    super(http, context);
  }

  model(attrs?: {[name: string]: any}): ODataModel {
    let cotr = <typeof ODataModelService>this.constructor;
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return new cotr.model(attrs || {}, query);
  }

  collection(attrs?: {[name: string]: any}[]) {
    let cotr = <typeof ODataModelService>this.constructor;
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return new cotr.collection(attrs || [], query);
  }

  attach<T extends ODataModel | ODataCollection>(model: T): T {
    let query = this.queryBuilder();
    query.entitySet(this.set);
    model.attach(query);
    return model;
  }
}
