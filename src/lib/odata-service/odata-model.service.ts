import { HttpClient } from '@angular/common/http';

import { ODataContext } from '../odata-context';
import { ODataEntityService } from './odata-entity.service';
import { ODataModel } from '../odata-model/odata-model';
import { ODataCollection } from '../odata-model/odata-collection';
import { Observable } from 'rxjs';

export abstract class ODataModelService<M extends ODataModel, C extends ODataCollection<M>> extends ODataEntityService<M> {
  static Model: new (...params: any) => ODataModel = ODataModel;
  static Collection: new (...params: any) => ODataCollection<ODataModel> = ODataCollection;

  constructor(protected http: HttpClient, protected context: ODataContext, protected set: string) {
    super(http, context, set);
  }

  collection(attrs: any) : C {
    let cotr = <any>this.constructor;
    return new cotr.Collection(attrs, {service: this});
  }

  model(attrs: any) : M {
    let cotr = <any>this.constructor;
    return new cotr.Model(attrs, {service: this});
  }

}
