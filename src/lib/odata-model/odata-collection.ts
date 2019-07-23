import { ODataModel, Model } from './odata-model';
import { ODataEntityService } from '../odata-service/odata-entity.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export class ODataCollection<M extends ODataModel> {
  static model: string = null;
  service: ODataEntityService<M>;
  models: M[];

  constructor(models: {[name: string]: any}[], service: ODataEntityService<M>) {
    this.service = service;
    this.models = this.parse(models);
  }

  parse(models: {[name: string]: any}) {
    let ctor = <typeof ODataCollection>this.constructor;
    let Model = this.service.context.getModel(ctor.model);
    return models.map(attrs => new Model(attrs, this.service) as M);
  }

  fetch(options?: any) {
    return this.service.all(options)
      .pipe(
        map(models => Object.assign(this, {models: this.parse(models.getEntities())}))
      );
  }
}
