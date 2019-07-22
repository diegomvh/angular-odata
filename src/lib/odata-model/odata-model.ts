import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataEntityService } from '../odata-service/odata-entity.service';
import { ODataResponse } from '../odata-response/odata-response';

export class Schema {
  fields: any[];
  relationships: any[];
  defaults: any;

  static create(opts: { fields?: any[], relationships?: any[], defaults?: any }) {
    return Object.assign(new Schema(), { fields: [], relationships: [], defaults: {} }, opts);
  }

  extend(opts: { fields?: any[], relationships?: any[], defaults?: any }) {
    let { fields, relationships, defaults } = this;
    fields = [...fields, ...(opts.fields || [])];
    relationships = [...relationships, ...(opts.relationships || [])];
    defaults = Object.assign({}, defaults, opts.defaults || {});
    return Object.assign(new Schema(), { fields, relationships, defaults });
  }

  parse(value, models) {
    return value;
  }

  json(model) {
    return this.fields.reduce((acc, field) => Object.assign(acc, {[field.name]: model[field.name]}), {});
  }
}

export class Model {
  static type: string = "";
  static schema: Schema = null;

  constructor(value?: any) {
    Object.assign(this, value);
  }

  toJSON() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.json(this);
  }
}

export class ODataModel extends Model {
  service: ODataEntityService<ODataModel>;

  constructor(value?: any, options?: { service?: ODataEntityService<ODataModel> }) {
    super(value)
    this.service = options.service;
  }

  toEntity() {
    let entity = this.toJSON();
    if (ODataResponse.ODATA_ETAG in this) {
      entity[ODataResponse.ODATA_ETAG] = this[ODataResponse.ODATA_ETAG];
    }
    return entity;
  }

  fetch<M>(options?: { parse?: boolean }): Observable<M> {
    let ctor = <typeof ODataModel>this.constructor;
    let entity = this.toEntity();
    options = Object.assign({parse: true}, options || {});
    return this.service.fetch(entity, options)
      .pipe(
        map(attrs => Object.assign(this, options.parse ? ctor.schema.parse(attrs, {}) : attrs))
      );
  }

  save<M>(options?: { parse?: boolean }): Observable<M> {
    let ctor = <typeof ODataModel>this.constructor;
    let entity = this.toEntity();
    options = Object.assign({parse: true}, options || {});
    return this.service.save(entity, options)
      .pipe(
        map(attrs => Object.assign(this, options.parse ? ctor.schema.parse(attrs, {}) : attrs))
      );
  }

  destroy(options?: any): Observable<any> {
    let entity = this.toEntity();
    return this.service.destroy(entity, options);
  }
}
