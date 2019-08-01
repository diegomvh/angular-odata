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
    let Ctor = this.context.getConstructor(ctor.modelType);
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return new (Ctor as typeof Model)(attrs || {}, query);
  }

  collection(models?: PlainObject[]) {
    let ctor = <typeof ODataModelService>this.constructor;
    let Ctor = this.context.getConstructor(ctor.collectionType);
    let query = this.queryBuilder();
    query.entitySet(this.set);
    return new (Ctor as typeof Collection)(models || [], query);
  }

  attach<T extends ODataModel | ODataCollection<ODataModel>>(model: T): T {
    let query = this.queryBuilder();
    query.entitySet(this.set);
    model.attach(query);
    return model;
  }
}
