import { Observable, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataResponse } from '../odata-response/odata-response';
import { Utils } from '../utils/utils';
import { ODataQueryBuilder, Expand, PlainObject } from '../odata-query/odata-query-builder';
import { Collection, ODataCollection } from './odata-collection';
import { ODataContext } from '../odata-context';
import { ODataQueryBase } from '../odata-query/odata-query-base';

export class Key {
  name: string;
  resolve?: (model: Model) => number | string | PlainObject;
}

export class Field {
  name: string;
  required: boolean;
  type: string;
  length?: number;
  key?: boolean;
  default?: any;
}

export class Schema {
  keys: Key[];
  fields: Field[];

  static create(opts: {keys?: Key[], fields?: Field[]}) {
    var keys = opts.keys || [];
    var fields = opts.fields || [];
    return Object.assign(new Schema(), { keys, fields });
  }

  extend(opts: {keys?: Key[], fields?: Field[]}) {
    var keys = [...this.keys, ...(opts.keys || [])];
    var fields = [...this.fields, ...(opts.fields || [])];
    return Object.assign(new Schema(), { keys, fields });
  }

  resolveKey(model: Model) {
    let keys = this.keys
      .map(key => [key.name, (key.resolve) ? key.resolve(model) : model[key.name]]);
    let key = keys.length === 1 ? 
      keys[0][1] :
      keys.reduce((acc, key) => Object.assign(acc, {[key[0]]: key[1]}), {});
    if (!Utils.isEmpty(key))
      return key;
  }

  isNew(model: Model) {
    return !this.resolveKey(model);
  }

  parse(attrs: {[name: string]: any}, context: ODataContext, ...params: any) {
    return this.fields.reduce((acc, field) => {
      if (field.name in attrs && attrs[field.name] != null) {
        acc[field.name] = context.parse(attrs[field.name], field.type, ...params);
      }
      return acc;
    }, {});
  }

  related(name: string, attrs: {[name: string]: any} | {[name: string]: any}[], context: ODataContext, ...params: any) {
    var field = this.fields.find(r => r.name === name);
    return context.parse(attrs, field.type, ...params);
  }

  toJSON(model: Model, context: ODataContext) {
    return this.fields.reduce((acc, field) => {
      if (field.name in model && model[field.name] != null) {
        acc[field.name] = context.toJSON(model[field.name], field.type);
      }
      return acc;
    }, {});
  } 
}

export class Model {
  static type: string = null;
  static schema: Schema = null;

  constructor(attrs: {[name: string]: any}, protected context: ODataContext) {
    Object.assign(this, this.parse(attrs));
  }

  isNew() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.isNew(this);
  }

  parse(attrs: {[name: string]: any}, ...params: any) {
    let ctor = <typeof Model>this.constructor;
    return Object.assign(
      Object.keys(attrs).filter(k => k.startsWith('@')).reduce((acc, k) => Object.assign(acc, {[k]: attrs[k]}), {}), 
      ctor.schema.parse(attrs, this.context, ...params));
  }

  protected relatedCollection<M extends Model>(name: string, ...params: any): Collection<M> {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.related(name, this[name] || [], this.context, ...params);
  }

  protected relatedModel<M extends Model>(name: string, ...params: any): M {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.related(name, this[name] || {}, this.context, ...params);
  }

  resolveKey() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.resolveKey(this);
  }

  toJSON() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.toJSON(this, this.context)
  }
}

export class ODataModel extends Model {
  private query: ODataQueryBuilder;
  constructor(
    attrs: {[name: string]: any}, 
    context: ODataContext, 
    query: ODataQueryBuilder
  ) {
    super(attrs, context);
    this.attach(query);
  }
  
  attach(query:ODataQueryBuilder) {
    this.query = query;
  }

  detached(): boolean {
    return !!this.query;
  }

  assign(entry: {[name: string]: any}, query: ODataQueryBuilder) {
    return Object.assign(this, this.parse(entry, query)
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

  save(options?: any): Observable<this> {
    let query = this.query.clone();
    let json = this.toJSON();
    let obs$ = EMPTY as Observable<ODataResponse>;
    if (!this.isNew()) {
      let key = this.resolveKey();
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

  protected relatedODataCollection<M extends ODataModel>(name: string): ODataCollection<M> {
    //TODO: assert key
    let query = this.query.clone();
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    return this.relatedCollection(name, query) as ODataCollection<M>;
  }

  protected relatedODataModel<M extends ODataModel>(name: string): M {
    //TODO: assert key
    let query = this.query.clone();
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    return this.relatedModel(name, query) as M;
  }

  protected createODataModelRef(name: string, target: ODataQueryBase, options?) {
    let query = this.query.clone();
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    let refurl = this.context.createEndpointUrl(target);
    return query.put({ [ODataResponse.ODATA_ID]: refurl }, this[ODataResponse.ODATA_ETAG], options);
  }

  protected deleteODataModelRef(name: string, target: ODataQueryBase, options?) {
    let query = this.query.clone();
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    let refurl = this.context.createEndpointUrl(target);
    return query.delete(this[ODataResponse.ODATA_ETAG], options);
  }

  protected createODataCollectionRef(name: string, target: ODataQueryBase, options?) {
    let query = this.query.clone();
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    let refurl = this.context.createEndpointUrl(target);
    return query.post({ [ODataResponse.ODATA_ID]: refurl }, options);
  }

  protected deleteODataCollectionRef(name: string, target: ODataQueryBase, options?) {
    let query = this.query.clone();
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    let refurl = this.context.createEndpointUrl(target);
    options = this.context.assignOptions(options || {}, { params: { "$id": refurl } });
    return query.delete(this[ODataResponse.ODATA_ETAG], options);
  }

  // Mutate query
  select(select?: string | string[]) {
    return this.query.select(select);
  }
  removeSelect() { this.query.removeSelect(); }

  expand(expand?: Expand) {
    return this.query.expand(expand);
  }
  removeExpand() { this.query.removeExpand(); }
}
