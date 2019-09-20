import { Observable, EMPTY, forkJoin, OperatorFunction, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ODataResponse } from '../odata-response/odata-response';
import { Utils } from '../utils/utils';
import { ODataQueryBuilder, Expand, PlainObject } from '../odata-query/odata-query-builder';
import { Collection, ODataCollection } from './odata-collection';
import { ODataQueryBase } from '../odata-query/odata-query-base';
import { ODataContext } from '../odata-context';
import { ODataQueryType } from '../odata-query/odata-query-type';
import { ODataService } from '../odata-service/odata.service';

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

export class Schema {
  keys: Key[];
  fields: Field[];

  static create(opts: { keys?: Key[], fields?: Field[] }) {
    var keys = opts.keys || [];
    var fields = opts.fields || [];
    return Object.assign(new Schema(), { keys, fields });
  }

  extend(opts: { keys?: Key[], fields?: Field[] }) {
    var keys = [...this.keys, ...(opts.keys || [])];
    var fields = [...this.fields, ...(opts.fields || [])];
    return Object.assign(new Schema(), { keys, fields });
  }

  resolveKey(model: Model) {
    let keys = this.keys
      .map(key => [key.name, (key.resolve) ? key.resolve(model) : model[key.name]]);
    let key = keys.length === 1 ?
      keys[0][1] :
      keys.reduce((acc, key) => Object.assign(acc, { [key[0]]: key[1] }), {});
    if (!Utils.isEmpty(key))
      return key;
  }

  isNew(model: Model) {
    return !this.resolveKey(model);
  }

  private parse(field: Field, value: any) {
    if (value == null) return value;
    switch (field.type) {
      case 'String': return typeof (value) === "string" ? value : value.toString();
      case 'Number': return typeof (value) === "number" ? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean" ? value : !!value;
      case 'Date': return value instanceof Date ? value : new Date(value);
    }
    return value;
  }

  private toJSON(field: Field, value: any) {
    if (value == null) return value;
    switch (field.type) {
      case 'String': return typeof (value) === "string" ? value : value.toString();
      case 'Number': return typeof (value) === "number" ? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean" ? value : !!value;
      case 'Date': return value instanceof Date ? value.toISOString() : value;
    }
    return value;
  }
  private defineProperty(model: Model, field: Field, value: any) {
    Object.defineProperty(model, field.name, {
      get() {
        if (!(field.name in this._relationships)) {
          let query = this._query.clone() as ODataQueryBuilder;
          if (this.isNew())
            throw new Error(`Can't resolve ${field.name} relation from new entity`)
          query.entityKey(this.resolveKey());
          query.navigationProperty(field.name);
          this._relationships[field.name] = this._context.createInstance(
            field.type, value || (field.collection ? [] : {}), query);
        }
        return this._relationships[field.name];
      },
      set(value: Model | null) {
        if (field.collection)
          throw new Error(`Can't set ${field.name} to collection, use add`);
        if (!(value as Model)._query.isEntity())
          throw new Error(`Can't set ${value} to model`);
        this._relationships[field.name] = value;
        /*
        let query = this._query.clone() as ODataQueryBuilder;
        query.entityKey(this.resolveKey());
        query.navigationProperty(field.name);
        this._relationships[field.name] = this._context.createInstance(
          field.type, value !== null ? value.toJSON() : {}, query);
        this.setState(ModelState.Modified);
        this._relationships[field.name].setState(value !== null ? ModelState.Added : ModelState.Deleted);
        */
      }
    });
  }

  deserialize(model: Model, attrs: PlainObject, query: ODataQueryBase) {
    let context = model._context;
    model._attributes = attrs;
    this.fields.filter(f => !f.related).forEach(f => {
      if (f.name in attrs) {
        model[f.name] = f.ctor ?
          context.createInstance(f.type, attrs[f.name], query) :
          this.parse(f, attrs[f.name]);
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
      this.defineProperty(model, f, attrs[f.name]);
    });
  }
}

export enum ModelState {
  Added,
  Modified,
  Deleted,
  Unchanged,
  Detached
}

export class Model {
  // Statics
  static type: string = "";
  static schema: Schema = null;
  _context: ODataContext;
  _state: ModelState;
  _query: ODataQueryBase;
  _attributes: PlainObject;
  _relationships: { [name: string]: Model | Collection<Model> }

  constructor(attrs: PlainObject, query?: ODataQueryBase) {
    this.assign(attrs, query);
    this.setQuery(query);
  }

  setState(state: ModelState) {
    this._state = state;
  }

  setContext(context: ODataContext) {
    this._context = context;
  }

  setQuery(query: ODataQueryBase) {
    this._query = query;
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

  clone() {
    let ctor = <typeof Model>this.constructor;
    return this._context.createInstance(
      ctor.type,
      this.toJSON(),
      this._query);
  }
}

export class ODataModel extends Model {
  constructor(
    attrs: PlainObject,
    query: ODataQueryBuilder
  ) {
    super(attrs, query);
  }

  assign(attrs: PlainObject, query: ODataQueryBuilder) {
    super.assign(attrs, query);
  }

  fetch(options?: any): Observable<this> {
    if (this.isNew())
      throw new Error(`Can't fetch without entity key`);
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    return query.get({responseType: 'json'})
      .pipe(
        map(entity => { this.assign(entity, query); return this })
      );
  }

  private batchSave(options?: any): Observable<this> {
    let query = this._query.clone() as ODataQueryBuilder;
    let batch = query.batch();
    if (!this.isNew()) {
      let key = this.resolveKey();
      query.entityKey(key);
      batch.put(query, this.toJSON());
    } else {
      batch.post(query, this.toJSON(), options);
    }
    let changes = Object.keys(this._relationships)
      .filter(k => this._relationships[k] === null || this._relationships[k] instanceof Model);
    // Relations 
    changes.forEach(name => {
      let model = this._relationships[name] as Model;
      let q = query.clone() as ODataQueryBuilder;
      q.entityKey(this.resolveKey());
      q.navigationProperty(name);
      q.ref();
      if (model === null) {
        batch.delete(q);
      } else {
        let target = model._query.clone() as ODataQueryBuilder;
        target.entityKey(model.resolveKey())
        let refurl = ""; //this._context.createEndpointUrl(target);
        batch.put(q, { [ODataService.ODATA_ID]: refurl });
      }
    });
    return batch.execute(options)
      .pipe(
        map(resp => { this.assign(resp, query); return this })
      );
  }

  private forkSave(options?: any): Observable<this> {
    let query = this._query.clone() as ODataQueryBuilder;
    let obs$ = of(this.toJSON());
    let changes = Object.keys(this._relationships)
      .filter(k => this._relationships[k] === null || this._relationships[k] instanceof Model);
    changes.forEach(name => {
      let model = this._relationships[name] as Model;
      let q = query.clone() as ODataQueryBuilder;
      q.entityKey(this.resolveKey());
      q.navigationProperty(name);
      q.ref();
      if (model === null) {
        // Delete 
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          q.delete(attrs[ODataService.ODATA_ETAG], options)
            .pipe(map(resp =>
              Object.assign(attrs, { [ODataService.ODATA_ETAG]: resp.toEntity()[ODataService.ODATA_ETAG] })
            ))
        ));
      } else {
        // Create
        let target = model._query.clone() as ODataQueryBuilder;
        target.entityKey(model.resolveKey())
        let refurl = ""; //this._context.createEndpointUrl(target);
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          q.put<any>({ [ODataService.ODATA_ID]: refurl }, attrs[ODataService.ODATA_ETAG], options)
            .pipe(map(resp =>
              Object.assign(attrs, { [ODataService.ODATA_ETAG]: resp[ODataService.ODATA_ETAG] })
            ))
        ));
      }
    });
    if (this.isNew()) {
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.post(attrs, {responseType: 'json'})));
    } else {
      let key = this.resolveKey();
      query.entityKey(key);
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.put(attrs, attrs[ODataService.ODATA_ETAG], {responseType: 'json'})));
    }
    return obs$.pipe(
      map(attrs => { console.log(attrs); this.assign(attrs, query); return this; })
    );
  }

  save(options?: any): Observable<this> {
    return (this._context.batchQueries) ?
      this.batchSave(options) :
      this.forkSave(options);
  }

  estroy(options?: any): Observable<any> {
    if (this.isNew())
      throw new Error(`Can't destroy without entity key`);
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    return query.delete(this[ODataService.ODATA_ETAG], options);
  }

  protected createODataModelRef(name: string, target: ODataQueryBuilder, options?) {
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    return query.put({ [ODataService.ODATA_ID]: refurl }, this[ODataService.ODATA_ETAG], options);
  }

  protected deleteODataModelRef(name: string, target: ODataQueryBuilder, options?) {
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    //let refurl = this.context.createEndpointUrl(target);
    return query.delete(this[ODataService.ODATA_ETAG], options);
  }

  protected createODataCollectionRef(name: string, target: ODataQueryBuilder, options?) {
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    return query.post({ [ODataService.ODATA_ID]: refurl }, options);
  }

  protected deleteODataCollectionRef(name: string, target: ODataQueryBuilder, options?) {
    let query = this._query.clone() as ODataQueryBuilder;
    query.entityKey(this.resolveKey());
    query.navigationProperty(name);
    query.ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    //options = this.context.assignOptions(options || {}, { params: { "$id": refurl } });
    return query.delete(this[ODataService.ODATA_ETAG], options);
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
