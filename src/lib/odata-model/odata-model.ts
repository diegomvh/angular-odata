import { ODataModelOptions } from './odata-model-options';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataEntityService } from '../odata-service/odata-entity.service';

export abstract class ODataModel {
  protected abstract meta(): ODataModelOptions<ODataModel>;
  protected service: ODataEntityService<ODataModel>;

  constructor(value: any, parse: boolean = true) {
    Object.assign(this, this.meta().attrs(value, parse));
  }

  toJSON() {
    return this.meta().json(this);
  }

  save(parse: boolean = true) : Observable<ODataModel> {
    return this.service.save(this.toJSON())
      .pipe(
        map(attrs => Object.assign(this, this.meta().attrs(attrs, parse)))
      );
  }

  destroy() : Observable<any> {
    return this.service.destroy(this.toJSON());
  }
}
