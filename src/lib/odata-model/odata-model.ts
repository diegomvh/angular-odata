import { Observable, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataResponse } from '../odata-response/odata-response';
import { Utils } from '../utils/utils';
import { ODataQueryBuilder, Expand, PlainObject } from '../odata-query/odata-query-builder';
import { Collection, ODataCollection } from './odata-collection';
import { ODataQueryBase } from '../odata-query/odata-query-base';
import { ODataContext } from '../odata-context';

export class Key {
  name: string;
  resolve?: (model: Model) => number | string | PlainObject;
}

export class Field {
  name: string;
  type: string;
  required?: boolean;
  length?: number;
  ctor?: boolean;
  related?: boolean;
  collection?: boolean;
  default?: any;
}

const instanceFactory = (Ctor: typeof Model | typeof Collection, field: Field, value: any, query: ODataQueryBase) => 
  (field.collection) ?
    new (Ctor as typeof Collection)(value as PlainObject[] || [], query):
    new (Ctor as typeof Model)(value as PlainObject || {}, query);
  
export class Schema {
  keys: Key[];
  fields: Field[];
  context: ODataContext;

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
 
  private parse(field: Field, value: any) {
    if (value == null) return value;
    switch(field.type) {
      case 'String': return typeof (value) === "string"? value : value.toString();
      case 'Number': return typeof (value) === "number"? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean"? value : !!value;
      case 'Date': return value instanceof Date ? value : new Date(value);
    }
    return value;
  }

  private toJSON(field: Field, value: any) {
    if (value == null) return value; 
    switch(field.type) {
      case 'String': return typeof (value) === "string"? value : value.toString();
      case 'Number': return typeof (value) === "number"? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean"? value : !!value;
      case 'Date': return value instanceof Date ? value.toISOString() : value;
    }
    return value;
  }

  private descriptor(field: Field, value: any) {
    let Ctor = this.context.getConstructor(field.type);
    return { 
      get() { 
        if (!(field.name in this._relationships)) {
          let query = this._query.clone() as ODataQueryBuilder;
          query.entityKey(this.resolveKey());
          query.navigationProperty(field.name);
          this._relationships[field.name] = instanceFactory(Ctor, field, value, query);
        }
        return this._relationships[field.name];
      }
    }
  }

  deserialize(model: Model, attrs: PlainObject, query: ODataQueryBase) {
    model._attributes = attrs;
    this.fields.filter(f => !f.related).forEach(f => {
      if (f.name in attrs) {
        model[f.name] = f.ctor ? instanceFactory(
          this.context.getConstructor(f.type),
          f, attrs[f.name], query) : this.parse(f, attrs[f.name]);
      }
    });
  }

  serialize(model: Model) {
    return this.fields.filter(f => !f.related).reduce((acc, f) => {
      if (f.name in model) {
        acc[f.name] = f.ctor ? 
          model[f.name].toJSON() : 
          this.toJSON(f, model[f.name]);
      }
      return acc;
    }, {});
  } 

  relationships(model: Model, attrs: PlainObject, query: ODataQueryBase) {
    model._relationships = {};
    this.fields.filter(f => f.related).forEach(f => {
      Object.defineProperty(model, f.name, this.descriptor(f, attrs[f.name]));
    });
  }
}

export class Model {
  // Statics
  static type: string = "";
  static schema: Schema = null;
  _query: ODataQueryBase;
  _attributes: PlainObject;
  _relationships: {[name: string]: Model | Collection<Model>}

  constructor(attrs: PlainObject, query?: ODataQueryBase) {
    this.assign(attrs, query);
  }

  isNew() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.isNew(this);
  }

  assign(attrs: PlainObject, query?: ODataQueryBase) {
    let ctor = <typeof Model>this.constructor;
    ctor.schema.deserialize(this, attrs, query);
    ctor.schema.relationships(this, attrs, query);
  }

  resolveKey() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.resolveKey(this);
  }

  toJSON() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.serialize(this);
  }
}

export class ODataModel extends Model {
  constructor(
    attrs: PlainObject, 
    query: ODataQueryBuilder
  ) {
    super(attrs, query);
    this.attach(query);
  }
  
  attach(query:ODataQueryBuilder) {
    this._query = query;
  }

  detached(): boolean {
    return !this._query;
  }

  assign(attrs: PlainObject, query: ODataQueryBuilder) {
    super.assign(attrs, query);
  }

  fetch(options?: any): Observable<this> {
    //TODO: assert key
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    return query.get(options)
      .pipe(
        map(resp => { this.assign(resp.toEntity(), query); return this })
      );
  }

  save(options?: any): Observable<this> {
    let query = this._query.clone() as ODataQueryBuilder;
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
        map(resp => { this.assign(resp.toEntity(), query); return this })
      );
  }

  destroy(options?: any): Observable<any> {
    //TODO: assert key
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    return query.delete(this[ODataResponse.ODATA_ETAG], options);
  }

  protected createODataModelRef(name: string, target: ODataQueryBuilder, options?) {
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    return query.put({ [ODataResponse.ODATA_ID]: refurl }, this[ODataResponse.ODATA_ETAG], options);
  }

  protected deleteODataModelRef(name: string, target: ODataQueryBuilder, options?) {
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    //let refurl = this.context.createEndpointUrl(target);
    return query.delete(this[ODataResponse.ODATA_ETAG], options);
  }

  protected createODataCollectionRef(name: string, target: ODataQueryBuilder, options?) {
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    return query.post({ [ODataResponse.ODATA_ID]: refurl }, options);
  }

  protected deleteODataCollectionRef(name: string, target: ODataQueryBuilder, options?) {
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    //options = this.context.assignOptions(options || {}, { params: { "$id": refurl } });
    return query.delete(this[ODataResponse.ODATA_ETAG], options);
  }

  // Mutate query
  select(select?: string | string[]) {
    return (this._query as ODataQueryBuilder).select(select);
  }
  removeSelect() { (this._query as ODataQueryBuilder).removeSelect(); }

  expand(expand?: Expand) {
    return (this._query as ODataQueryBuilder).expand(expand);
  }
  removeExpand() { (this._query as ODataQueryBuilder).removeExpand(); }
}
