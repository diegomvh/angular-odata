import { HttpClient } from '@angular/common/http';

import { ODataContext } from '../odata-context';
import { ODataModel, Model } from '../odata-model/odata-model';
import { ODataService } from './odata.service';
import { ODataCollection, Collection } from '../odata-model/odata-collection';
import { PlainObject } from '../odata-query/odata-query-builder';

export abstract class ODataModelService extends ODataService {
  static modelType: string = "";
  static collectionType: string = "";

  constructor(protected http: HttpClient, public context: ODataContext, public set: string) {
    super(http, context);
  }

  model(attrs?: PlainObject) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return this.context.createInstance(ctor.modelType, attrs || {}, query);
  }

  collection(models?: PlainObject[]) {
    let ctor = <typeof ODataModelService>this.constructor;
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return this.context.createInstance(ctor.collectionType, models || [], query);
  }

  attach<T extends ODataModel | ODataCollection<ODataModel>>(model: T): T {
    let query = this.queryBuilder();
    query.entitySet(this.set);
    model.setQuery(query);
    return model;
  }
}
