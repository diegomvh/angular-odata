import { Observable, EMPTY, forkJoin, OperatorFunction, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Utils } from '../utils/utils';
import { Collection } from './odata-collection';
import { ODataContext } from '../odata-context';
import { ODataService } from '../odata-service/odata.service';
import { PlainObject, ODataSingletonRequest, ODataSingleRequest, ODataRequest, Expand, ODataEntityRequest, ODataEntitySetRequest } from '../odata-request';

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
          let query = this._query.clone() as ODataEntityRequest<Model>;
          if (this.isNew())
            throw new Error(`Can't resolve ${field.name} relation from new entity`)
          query.key(this.resolveKey());
          let nav = query.navigationProperty<any>(field.name);
          this._relationships[field.name] = this._context.createInstance(
            field.type, value || (field.collection ? [] : {}), field.collection ? nav.collection() : nav.single());
        }
        return this._relationships[field.name];
      },
      set(value: Model | null) {
        if (field.collection)
          throw new Error(`Can't set ${field.name} to collection, use add`);
        if (!((value as Model)._query instanceof ODataSingleRequest))
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

  deserialize(model: Model, attrs: PlainObject, query: ODataSingleRequest<Model>) {
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

  relationships(model: Model, attrs: PlainObject, query: ODataSingleRequest<Model>) {
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
  _query: ODataSingleRequest<Model>;
  _attributes: PlainObject;
  _relationships: { [name: string]: Model | Collection<Model> }

  constructor(attrs: PlainObject, query?: ODataSingleRequest<Model>) {
    this.assign(attrs, query);
    this.setQuery(query);
  }

  setState(state: ModelState) {
    this._state = state;
  }

  setContext(context: ODataContext) {
    this._context = context;
  }

  setQuery(query: ODataSingleRequest<Model>) {
    this._query = query;
  }

  isNew() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.isNew(this);
  }

  assign(attrs: PlainObject, query?: ODataSingleRequest<Model>) {
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
    query: ODataSingleRequest<Model>
  ) {
    super(attrs, query);
  }

  assign(attrs: PlainObject, query: ODataSingleRequest<Model>) {
    super.assign(attrs, query);
  }

  fetch(options?: any): Observable<this> {
    if (this.isNew())
      throw new Error(`Can't fetch without entity key`);
    let query = this._query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    return query.get()
      .pipe(
        map(entity => { this.assign(entity, query); return this })
      );
  }

  private batchSave(options?: any): Observable<this> {
    let query = this._query.clone() as ODataEntityRequest<Model>;
    let batch = null; //query.batch();
    if (!this.isNew()) {
      let key = this.resolveKey();
      query.key(key);
      batch.put(query, this.toJSON());
    } else {
      batch.post(query, this.toJSON(), options);
    }
    let changes = Object.keys(this._relationships)
      .filter(k => this._relationships[k] === null || this._relationships[k] instanceof Model);
    // Relations 
    changes.forEach(name => {
      let model = this._relationships[name] as Model;
      let q = query.clone() as ODataEntityRequest<Model>;
      q.key(this.resolveKey());
      let ref = q.navigationProperty(name).ref();
      if (model === null) {
        batch.delete(q);
      } else {
        let target = model._query.clone() as ODataEntityRequest<Model>;
        target.key(model.resolveKey())
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
    let query = this._query.clone() as ODataEntityRequest<Model>;
    let obs$ = of(this.toJSON());
    let changes = Object.keys(this._relationships)
      .filter(k => this._relationships[k] === null || this._relationships[k] instanceof Model);
    changes.forEach(name => {
      let model = this._relationships[name] as Model;
      let q = query.clone() as ODataEntityRequest<Model>;
      q.key(this.resolveKey());
      let ref = q.navigationProperty(name).ref();
      if (model === null) {
        // Delete 
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          q.delete(attrs[ODataService.ODATA_ETAG], options)
            .pipe(map(resp =>
              Object.assign(attrs, { [ODataService.ODATA_ETAG]: resp[ODataService.ODATA_ETAG] })
            ))
        ));
      } else {
        // Create
        let target = model._query.clone() as ODataEntityRequest<Model>;
        target.key(model.resolveKey())
        let refurl = ""; //this._context.createEndpointUrl(target);
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          ref.put({ [ODataService.ODATA_ID]: refurl }, attrs[ODataService.ODATA_ETAG], options)
            .pipe(map(resp =>
              Object.assign(attrs, { [ODataService.ODATA_ETAG]: resp[ODataService.ODATA_ETAG] })
            ))
        ));
      }
    });
    if (this.isNew()) {
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.post(attrs as Model)));
    } else {
      let key = this.resolveKey();
      query.key(key);
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.put(attrs as Model, attrs[ODataService.ODATA_ETAG])));
    }
    return obs$.pipe(
      map(attrs => { console.log(attrs); this.assign(attrs, query); return this; })
    );
  }

  save(options?: any): Observable<this> {
    return (this._context.batch) ?
      this.batchSave(options) :
      this.forkSave(options);
  }

  estroy(options?: any): Observable<any> {
    if (this.isNew())
      throw new Error(`Can't destroy without entity key`);
    let query = this._query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    return query.delete(this[ODataService.ODATA_ETAG], options);
  }

  protected createODataModelRef(name: string, target: ODataRequest, options?) {
    let query = this._query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    let ref = query.navigationProperty(name).ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    return ref.put({ [ODataService.ODATA_ID]: refurl }, this[ODataService.ODATA_ETAG], options);
  }

  protected deleteODataModelRef(name: string, target: ODataRequest, options?) {
    let query = this._query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    let ref = query.navigationProperty(name).ref();
    //let refurl = this.context.createEndpointUrl(target);
    return ref.delete(this[ODataService.ODATA_ETAG], options);
  }

  protected createODataCollectionRef(name: string, target: ODataRequest, options?) {
    let query = this._query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    let ref = query.navigationProperty(name).ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    return ref.post({ [ODataService.ODATA_ID]: refurl }, options);
  }

  protected deleteODataCollectionRef(name: string, target: ODataRequest, options?) {
    let query = this._query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    let ref = query.navigationProperty(name).ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    //options = this.context.assignOptions(options || {}, { params: { "$id": refurl } });
    return ref.delete(this[ODataService.ODATA_ETAG], options);
  }

  // Mutate query
  select(select?: string | string[]) {
    return (this._query as ODataEntityRequest<Model>).select(select);
  }
  removeSelect() { (this._query as ODataEntityRequest<Model>).removeSelect(); }

  expand(expand?: Expand) {
    return (this._query as ODataEntityRequest<Model>).expand(expand);
  }
  removeExpand() { (this._query as ODataEntityRequest<Model>).removeExpand(); }
}
