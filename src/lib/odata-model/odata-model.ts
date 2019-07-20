import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataEntityService } from '../odata-service/odata-entity.service';

export class Schema {
  fields: any[];
  relations: any[];
  defaults: any;

  constructor(opts: {fields?: any[], relations?: any[], defaults?: any}) {
    Object.assign(this, {relations: [], defaults: {}}, opts);
  }

  attrs(value: any, parse: boolean) {
    let attrs = parse ? this.parse(value) : value;
    return Object.assign({}, this.defaults, attrs);
  }

  parse(value) {
    return value;
  }

  json(model) {
    return model;
  }
}

export class Model {
  static schema: Schema = null;

  constructor(value: any, opts: {parse: boolean}) {
    let ctor = <typeof Model>this.constructor;
    Object.assign(this, ctor.schema.attrs(value, opts.parse));
  }

  toJSON() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.json(this);
  }
}

export class ODataModel extends Model {
  service: ODataEntityService<ODataModel>;

  constructor(value: any, opts: {parse: boolean, service: ODataEntityService<ODataModel>}) {
    super(value, opts)
    this.service = opts.service;
  }

  fetch(opts: {parse: boolean}) : Observable<ODataModel> {
    let ctor = <typeof ODataModel>this.constructor;
    return this.service.fetch(this.toJSON())
      .pipe(
        map(attrs => Object.assign(this, ctor.schema.attrs(attrs, opts.parse)))
      );
  }

  save(opts: {parse: boolean}) : Observable<ODataModel> {
    let ctor = <typeof ODataModel>this.constructor;
    return this.service.save(this.toJSON())
      .pipe(
        map(attrs => Object.assign(this, ctor.schema.attrs(attrs, opts.parse)))
      );
  }

  destroy() : Observable<any> {
    return this.service.destroy(this.toJSON());
  }
}
