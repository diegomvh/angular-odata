import { HttpClient } from '@angular/common/http';

import { ODataContext } from '../odata-context';
import { ODataEntityService } from './odata-entity.service';
import { ODataModel } from '../odata-model/odata-model';
import { ODataCollection } from '../odata-model/odata-collection';

export abstract class ODataModelService<M extends ODataModel, C extends ODataCollection<M>> extends ODataEntityService<M> {
  static Model: new (...params: any) => ODataModel = ODataModel;
  static Collection: new (...params: any) => ODataCollection<ODataModel> = ODataCollection;

  constructor(protected http: HttpClient, protected context: ODataContext, protected set: string) {
    super(http, context, set);
  }

  collection<T extends C>(attrs: any, type?: new (...params: any) => T) : T {
    if (type == null) {
      let cotr = <any>this.constructor;
      type = cotr.Collection;
    }
    return new type(attrs, {service: this});
  }

  model<T extends M>(attrs: any, type?: new (...params: any) => T) : T {
    if (type == null) {
      let cotr = <any>this.constructor;
      type = cotr.Model;
    }
    return new type(attrs, {service: this});
  }
}
