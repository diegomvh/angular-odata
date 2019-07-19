import { ODataModelOptions } from './odata-model-options';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataEntityService } from '../odata-service/odata-entity.service';

export abstract class ODataModel {
  protected abstract _meta(): ODataModelOptions<ODataModel>;
  protected _service: ODataEntityService<ODataModel>;

  constructor(value: any, parse: boolean = true) {
    Object.assign(this, this._meta().attrs(value, parse));
  }

  toJSON() {
    return this._meta().json(this);
  }

  save(parse: boolean = true) : Observable<ODataModel> {
    return this._service.save(this.toJSON())
      .pipe(
        map(attrs => Object.assign(this, this._meta().attrs(attrs, parse)))
      );
  }

  destroy() : Observable<any> {
    return this._service.destroy(this.toJSON());
  }
}
