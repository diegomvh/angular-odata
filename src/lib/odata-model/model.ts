import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Utils } from '../utils/utils';
import { PlainObject, Expand, ODataEntityRequest, ODataRequest } from '../odata-request';

import { ODataClient } from '../client';
import { ODataConfig } from '../config';

export interface Key {
  name: string;
  resolve?: (model: ODataModel) => number | string | PlainObject;
}

export interface Field {
  name: string;
  type: string;
  required?: boolean;
  ctor?: { new(...args: any[]): any; };
  length?: number;
  navigation?: boolean;
  field?: string;
  ref?: string;
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

  configure(config: ODataConfig) {
    this.fields.forEach(f => {
      if (f.type in config.models) {
        f.ctor = config.models[f.type];
      }
      else if (f.type in config.collections) {
        f.ctor = config.collections[f.type];
      }
    });
  }

  resolveKey(model: ODataModel) {
    let keys = this.keys
      .map(key => [key.name, (key.resolve) ? key.resolve(model) : model[key.name]]);
    let key = keys.length === 1 ?
      keys[0][1] :
      keys.reduce((acc, key) => Object.assign(acc, { [key[0]]: key[1] }), {});
    if (!Utils.isEmpty(key))
      return key;
  }

  isNew(model: ODataModel) {
    return !this.resolveKey(model);
  }

  get navigations(): Field[] {
    return this.fields.filter(f => f.navigation);
  }

  get properties(): Field[] {
    return this.fields.filter(f => !f.navigation);
  }

  parse(field: Field, value: any) {
    if (value == null) return value;
    switch (field.type) {
      case 'String': return typeof (value) === "string" ? value : value.toString();
      case 'Number': return typeof (value) === "number" ? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean" ? value : !!value;
      case 'Date': return value instanceof Date ? value : new Date(value);
      default:
        return new field.ctor(value || (field.collection ? [] : {}));
    }
  }

  toJSON(field: Field, value: any) {
    if (value == null) return value;
    switch (field.type) {
      case 'String': return typeof (value) === "string" ? value : value.toString();
      case 'Number': return typeof (value) === "number" ? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean" ? value : !!value;
      case 'Date': return value instanceof Date ? value.toISOString() : value;
      default:
        return value.toJSON();
    }
  }

  deserialize(model: ODataModel, attrs: PlainObject) {
    this.properties.forEach(f => {
      if (f.name in attrs) {
        model[f.name] = this.parse(f, attrs[f.name]);
      }
    });
  }

  serialize(model: ODataModel) {
    return this.properties.reduce((acc, f) => {
      if (f.name in model) {
        acc[f.name] = this.toJSON(f, model[f.name]);
      }
      return acc;
    }, {});
  }

  relationships(model: ODataModel, attrs: PlainObject) {
    let parse = this.parse;
    model.relationships = {};
    this.navigations.forEach(field => {
      Object.defineProperty(model, field.name, {
        get() {
          if (!(field.name in this.relationships)) {
            let query = this.query.clone() as ODataEntityRequest<ODataModel>;
            if (this.isNew())
              throw new Error(`Can't resolve ${field.name} relation from new entity`)
            query.key(this.resolveKey());
            let nav = query.navigationProperty<any>(field.name);
            this.relationships[field.name] = parse(field, attrs[field.name]);
            this.relationships[field.name].query = nav;
          }
          return this.relationships[field.name];
        },
        set(value: ODataModel | null) {
          if (field.collection)
            throw new Error(`Can't set ${field.name} to collection, use add`);
          if (!((value as ODataModel).query instanceof ODataEntityRequest))
            throw new Error(`Can't set ${value} to model`);
          this.relationships[field.name] = value;
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

export class ODataModel {
  // Statics
  static schema: Schema = null;
  query: ODataRequest;
  state: ModelState;
  relationships: { [name: string]: any }

  constructor(attrs: PlainObject, query: ODataRequest) {
    this.assign(attrs, query);
  }

  setState(state: ModelState) {
    this.state = state;
  }

  isNew() {
    let Ctor = <typeof ODataModel>this.constructor;
    return Ctor.schema.isNew(this);
  }

  assign(attrs: PlainObject, query: ODataRequest) {
    let Ctor = <typeof ODataModel>this.constructor;
    Ctor.schema.deserialize(this, attrs);
    Ctor.schema.relationships(this, attrs);
  }

  resolveKey() {
    let Ctor = <typeof ODataModel>this.constructor;
    return Ctor.schema.resolveKey(this);
  }

  toJSON() {
    let Ctor = <typeof ODataModel>this.constructor;
    return Ctor.schema.serialize(this);
  }

  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toJSON(), this.query.clone());
  }

  fetch(options?: any): Observable<this> {
    if (this.isNew())
      throw new Error(`Can't fetch without entity key`);
    let query = this.query.clone() as ODataEntityRequest<ODataModel>;
    query.key(this.resolveKey());
    return query.get()
      .pipe(
        map(entity => { this.assign(entity, query); return this })
      );
  }

  private save(options?: any): Observable<this> {
    let query = this.query.clone() as ODataEntityRequest<ODataModel>;
    let obs$ = of(this.toJSON());
    let changes = Object.keys(this.relationships)
      .filter(k => this.relationships[k] === null || this.relationships[k] instanceof ODataModel);
    changes.forEach(name => {
      let model = this.relationships[name] as ODataModel;
      let q = query.clone() as ODataEntityRequest<ODataModel>;
      q.key(this.resolveKey());
      let ref = q.navigationProperty(name).ref();
      if (model === null) {
        // Delete 
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          q.delete(attrs[ODataClient.ODATA_ETAG], options)
            .pipe(map(resp =>
              Object.assign(attrs, { [ODataClient.ODATA_ETAG]: resp[ODataClient.ODATA_ETAG] })
            ))
        ));
      } else {
        // Create
        let target = model.query.clone() as ODataEntityRequest<ODataModel>;
        target.key(model.resolveKey())
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          ref.put(target, attrs[ODataClient.ODATA_ETAG], options)
            .pipe(map(resp =>
              Object.assign(attrs, { [ODataClient.ODATA_ETAG]: resp[ODataClient.ODATA_ETAG] })
            ))
        ));
      }
    });
    if (this.isNew()) {
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.post(attrs as ODataModel)));
    } else {
      let key = this.resolveKey();
      query.key(key);
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.put(attrs as ODataModel, attrs[ODataClient.ODATA_ETAG])));
    }
    return obs$.pipe(
      map(attrs => { console.log(attrs); this.assign(attrs, query); return this; })
    );
  }

  destroy(options?: any): Observable<any> {
    if (this.isNew())
      throw new Error(`Can't destroy without entity key`);
    let query = this.query.clone() as ODataEntityRequest<ODataModel>;
    query.key(this.resolveKey());
    return query.delete(this[ODataClient.ODATA_ETAG], options);
  }

  // Mutate query
  select(select?: string | string[]) {
    return (this.query as ODataEntityRequest<ODataModel>).select(select);
  }

  expand(expand?: Expand) {
    return (this.query as ODataEntityRequest<ODataModel>).expand(expand);
  }
}
