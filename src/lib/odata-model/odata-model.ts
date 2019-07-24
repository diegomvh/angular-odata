import { Observable, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataResponse } from '../odata-response/odata-response';
import { Utils } from '../utils/utils';
import { ODataQueryBuilder } from '../odata-query/odata-query-builder';
import { Collection, ODataCollection } from './odata-collection';
import { EntitySet } from '../odata-response/entity-collection';

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
      if (field.name in attrs && typeof(attrs[field.name]) !== 'undefined') {
        acc[field.name] = context.parse(attrs[field.name], field.type, query);
      }
      return acc;
    }, {});
  }

  related(name: string, attrs: {[name: string]: any} | {[name: string]: any}[], query: ODataQueryBuilder) {
    let context = query.service.context;
    var relationship = this.relationships.find(r => r.name === name);
    return context.parse(attrs, relationship.type, query);
  }

  json(model: Model, query: ODataQueryBuilder) {
    let context = query.service.context;
    return this.fields.reduce((acc, field) => {
      if (field.name in model && typeof(model[field.name]) !== 'undefined') {
        acc[field.name] = context.toJSON(model[field.name], field.type);
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

  related(name: string, attrs: {[name: string]: any} | {[name: string]: any}[], query: ODataQueryBuilder) {
    let ctor = <typeof Model>this.constructor;
    let collection = ctor.schema.related(name, attrs, query);
    return collection;
  }

  resolveKey() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.resolveKey(this);
  }

  toJSON(query: ODataQueryBuilder) {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.json(this, query)
  }
}

export class ODataModel extends Model {
  query: ODataQueryBuilder;

  constructor(attrs: {[name: string]: any}, query: ODataQueryBuilder) {
    super(attrs, query);
    this.query = query;
  }

  assign(entry: {[name: string]: any}, query: ODataQueryBuilder) {
    return Object.assign(this, 
      Object.keys(entry).filter(k => k.startsWith('@')).reduce((acc, k) => Object.assign(acc, {[k]: entry[k]}), {}), 
      this.parse(entry, query)
    );
  }

  relatedMany<M extends ODataModel>(name: string, entitySet: EntitySet<M>, query: ODataQueryBuilder): ODataCollection<M> {
    let collection = super.related(name, [], query) as ODataCollection<M>;
    collection.assign(entitySet, query);
    return collection;
  }

  relatedOne<M extends ODataModel>(name: string, attrs: {[name: string]: any}, query: ODataQueryBuilder): M {
    let model = super.related(name, {}, query) as M;
    model.assign(attrs, query);
    return model;
  }

  toJSON() {
    return super.toJSON(this.query);
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

  save(options?: any): Observable<this> {
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

  protected hasMany<M extends ODataModel>(name, options?): Observable<ODataCollection<M>> {
    let query = this.query.clone();
    query.navigationProperty(name);
    return query.get(options)
      .pipe(
        map(resp => this.relatedMany(name, resp.toEntitySet<M>(), query) as ODataCollection<M>)
      );
  }

  protected hasOne<M extends ODataModel>(name, options?): Observable<M> {
    let query = this.query.clone();
    query.navigationProperty(name);
    return query.get(options)
      .pipe(
        map(resp => this.relatedOne(name, resp.toEntity<M>(), query) as M)
      );
  }
}
