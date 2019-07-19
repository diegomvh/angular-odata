import { ODataModelSchema } from './odata-model-schema';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataEntityService } from '../odata-service/odata-entity.service';

export abstract class ODataModel {
  protected abstract schema(): ODataModelSchema;
  protected service: ODataEntityService<ODataModel>;

  constructor(value: any, parse: boolean = true) {
    Object.assign(this, this.schema().attrs(value, parse));
  }

  toJSON() {
    return this.schema().json(this);
  }

  save(parse: boolean = true) : Observable<ODataModel> {
    return this.service.save(this.toJSON())
      .pipe(
        map(attrs => Object.assign(this, this.schema().attrs(attrs, parse)))
      );
  }

  destroy() : Observable<any> {
    return this.service.destroy(this.toJSON());
  }
}
