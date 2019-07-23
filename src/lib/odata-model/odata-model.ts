import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataEntityService } from '../odata-service/odata-entity.service';
import { ODataResponse } from '../odata-response/odata-response';
import { ODataContext } from '../odata-context';

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

  parse(attrs: {[name: string]: any}, context: ODataContext) {
    return this.fields.reduce((attrs, field) => {
      if (field.name in attrs) {
        var value = attrs[field.name];
        if (typeof (value) !== field.type.toLowerCase()) {
          var Model = context.getModel(field.type);
          if (Model != null && value != null)
            attrs[field.name] = field.collection ? value.map(v => new Model(v, context)) : new Model(value, context);
        }
      }
      return attrs;
    }, attrs);
  }

  json(model) {
    return this.fields.reduce((json, field) => {
      if (field.name in model) {
        var value = this[field.name];
        json[field.name] = field.collection ? value.map(v => v.toJSON()) : value.toJSON();
      }
      return json;
    }, {});
  } 
}

export class Model {
  static type: string = null;
  static schema: Schema = null;

  constructor(attrs: {[name: string]: any}, context: ODataContext) {
    let ctor = <typeof Model>this.constructor;
    Object.assign(this, ctor.schema.parse(attrs, context));
  }

  toJSON() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.json(this)
  }
}

export class ODataModel extends Model {
  service: ODataEntityService<ODataModel>;

  constructor(attrs: {[name: string]: any}, service: ODataEntityService<ODataModel>) {
    super(attrs, service.context);
    this.service = service;
  }

  toEntity() {
    let entity = this.toJSON();
    if (ODataResponse.ODATA_ETAG in this) {
      entity[ODataResponse.ODATA_ETAG] = this[ODataResponse.ODATA_ETAG];
    }
    return entity;
  }

  parse(attrs: {[name: string]: any}) {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.parse(attrs, this.service.context);
  }

  fetch<M>(options?: any): Observable<M> {
    let entity = this.toEntity();
    return this.service.fetch(entity, options)
      .pipe(
        map(attrs => Object.assign(this, this.parse(attrs)))
      );
  }

  save<M>(options?: any): Observable<M> {
    let entity = this.toEntity();
    return this.service.save(entity, options)
      .pipe(
        map(attrs => Object.assign(this, this.parse(attrs)))
      );
  }

  destroy(options?: any): Observable<any> {
    let entity = this.toEntity();
    return this.service.destroy(entity, options);
  }
}
