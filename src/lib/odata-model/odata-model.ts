import { Observable, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataResponse } from '../odata-response/odata-response';
import { ODataContext } from '../odata-context';
import { Utils } from '../utils/utils';
import { ODataQueryBuilder } from '../odata-query/odata-query-builder';

export class Schema {
  keys: string[];
  fields: any[];
  relationships: any[];
  defaults: any;

  static create(opts: { keys?: string[], fields?: any[], relationships?: any[], defaults?: any }) {
    return Object.assign(new Schema(), { keys: [], fields: [], relationships: [], defaults: {} }, opts);
  }

  extend(opts: { keys?: string[], fields?: any[], relationships?: any[], defaults?: any }) {
    let { keys, fields, relationships, defaults } = this;
    keys = [...keys, ...(opts.keys || [])];
    fields = [...fields, ...(opts.fields || [])];
    relationships = [...relationships, ...(opts.relationships || [])];
    defaults = Object.assign({}, defaults, opts.defaults || {});
    return Object.assign(new Schema(), { keys, fields, relationships, defaults });
  }

  resolveKey(model: Model) {
    let key = this.keys.length === 1 ? 
      model[this.keys[0]] : 
      this.keys.reduce((acc, key) => Object.assign(acc, {[key]: model[key]}), {});
    if (!Utils.isEmpty(key))
      return key;
  }

  isNew(model: Model) {
    return !this.resolveKey(model);
  }

  parse(attrs: {[name: string]: any}, query: ODataQueryBuilder) {
    let context = query.service.context;
    return this.fields.reduce((acc, field) => {
      if (field.name in attrs && attrs[field.name] != null) {
        acc[field.name] = Array.isArray(attrs[field.name]) ? 
          attrs[field.name].map(v => context.parseValue(v, field.type, query)) :
          context.parseValue(attrs[field.name], field.type, query);
      }
      return acc;
    }, {});
  }

  json(model: Model) {
    return this.fields.reduce((acc, field) => {
      if (field.name in model && model[field.name] != null) {
        var value = model[field.name];
        acc[field.name] = field.collection ? value.map(v => v.toJSON()) : value.toJSON();
      }
      return acc;
    }, {});
  } 
}

export class Model {
  static type: string = null;
  static schema: Schema = null;

  constructor(attrs: {[name: string]: any}, query: ODataQueryBuilder) {
    Object.assign(this, this.parse(attrs, query));
  }

  parse(attrs: {[name: string]: any}, query: ODataQueryBuilder) {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.parse(attrs, query);
  }

  resolveKey() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.resolveKey(this);
  }

  toJSON() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.json(this)
  }
}

export class ODataModel extends Model {
  query: ODataQueryBuilder;

  constructor(attrs: {[name: string]: any}, query: ODataQueryBuilder) {
    super(attrs, query);
    this.query = query;
  }

  private assign(entry: {[name: string]: any}, query: ODataQueryBuilder) {
    return Object.assign(this, 
      Object.keys(entry).filter(k => k.startsWith('@')).reduce((acc, k) => Object.assign(acc, {[k]: entry[k]}), {}), 
      this.parse(entry, query)
    );
  }

  fetch(options?: any): Observable<this> {
    //TODO: assert key
    let query = this.query.clone();
    query.entityKey(this.resolveKey());
    return query.get(options)
      .pipe(
        map(resp => this.assign(resp.toEntity(), query))
      );
  }

  save<M>(options?: any): Observable<this> {
    let query = this.query.clone();
    let ctor = <typeof Model>this.constructor;
    let json = this.toJSON();
    let obs$ = EMPTY as Observable<ODataResponse>;
    if (!ctor.schema.isNew(this)) {
      let key = ctor.schema.resolveKey(this);
      query.entityKey(key);
      obs$ = query.put(json, this[ODataResponse.ODATA_ETAG], options);
    } else {
      obs$ = query.post(json, options);
    }
    return obs$ 
      .pipe(
        map(resp => this.assign(resp.toEntity(), query))
      );
  }

  destroy(options?: any): Observable<any> {
    //TODO: assert key
    let query = this.query.clone();
    query.entityKey(this.resolveKey());
    return query.delete(this[ODataResponse.ODATA_ETAG], options);
  }
}
