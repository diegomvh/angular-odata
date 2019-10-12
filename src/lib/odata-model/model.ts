import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { PlainObject, Expand, ODataEntityRequest, ODataRequest } from '../odata-request';

import { ODataClient } from '../client';
import { ODataCollection } from './collection';
import { ODataNavigationPropertyRequest } from '../odata-request/requests/navigationproperty';
import { Enums } from '../utils/enums';
import { Schema, Field, Key } from './schema';
import { ODataSettings } from '../settings';

interface ModelKey extends Key {
}

interface ModelField extends Field {
  enum?: {[key: number]: string | number};
  model?: { new(attrs: PlainObject, query: ODataRequest): ODataModel };
  collection?: { new(models: PlainObject[], query: ODataRequest): ODataCollection<ODataModel> };
}

const PARSERS = {
  'string': (value) => String(value),
  'number': (value) => Number(value),
  'boolean': (value) => Boolean(value),
  'Date': (value) => new Date(value),
};

export class ModelSchema<M> extends Schema<ModelKey, ModelField, M> {
  static create<M extends ODataModel>(opts: { keys?: ModelKey[], fields?: ModelField[] }) {
    var keys = opts.keys || [];
    var fields = opts.fields || [];
    return Object.assign(new ModelSchema(), { keys, fields }) as ModelSchema<M>;
  }

  extend<M extends ODataModel>(opts: { keys?: ModelKey[], fields?: ModelField[] }) {
    let Cotr = <typeof ModelSchema>this.constructor;
    let keys = [...this.keys, ...(opts.keys || [])];
    let fields = [...this.fields, ...(opts.fields || [])];
    return Object.assign(new Cotr(), { keys, fields }) as ModelSchema<M>;
  }

  configure(settings: ODataSettings) {
    super.configure(settings);
    this.fields.forEach(f => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
      } else if (f.type in settings.models) {
        f.model = settings.models[f.type];
      }
      else if (f.type in settings.collections) {
        f.collection = settings.collections[f.type];
      }
    });
  }

  parse(field: ModelField, value: any, query: ODataRequest) {
    if (value === null) return value;
    if (field.enum) {
      return field.isFlags ? 
        Enums.toFlags(field.enum, value) : 
        Enums.toValue(field.enum, value); 
    } else if (field.model) {
      return new field.model(value || {}, query);
    } else if (field.collection) {
      return new field.collection(value || [], query);
    } else if (field.type in PARSERS) {
      return (Array.isArray(value) && field.isCollection) ? 
        value.map(PARSERS[field.type]) : 
        PARSERS[field.type](value);
    }
    return value;
  }

  toJSON(field: ModelField, value: any) {
    if (value === null) return value;
    if (field.enum) {
      return Enums.toString(field.enum, value); 
    } else if (field.model) {
      return value.toJSON();
    } else if (field.collection) {
      return value.toJSON();
    }
    return value;
  }

  serialize(model: ODataModel) {
    return this.properties.filter(f => f.name in model).reduce((acc, f) => 
      Object.assign(acc, {[f.name]: this.toJSON(f, model[f.name])}), 
      {});
  }

  deserialize(model: ODataModel, attrs: PlainObject, query: ODataRequest) {
    Object.assign(model, this.properties.filter(f => f.name in attrs).reduce((acc, f) => 
      Object.assign(acc, {[f.name]: this.parse(f, attrs[f.name], query)}), 
      {})
    );
  }

  relationships(model: ODataModel, attrs: PlainObject, query: ODataRequest) {
    let parse = this.parse;
    model.relationships = {};
    this.navigations.forEach(field => {
      Object.defineProperty(model, field.name, {
        get() {
          if (!(field.name in this.relationships)) {
            let query: ODataEntityRequest<ODataModel> | ODataNavigationPropertyRequest<ODataModel> = this.query.clone();
            if (query instanceof ODataEntityRequest) {
              if (this.isNew())
                throw new Error(`Can't resolve ${field.name} relation from new entity`);
              query.key(this.resolveKey());
            }
            let nav = query.navigationProperty<any>(field.name);
            this.relationships[field.name] = parse(field, attrs[field.name], nav);
          }
          return this.relationships[field.name];
        },
        set(value: ODataModel | null) {
          if (field.isCollection)
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
  static schema: ModelSchema<ODataModel> = null;
  query: ODataRequest;
  state: ModelState;
  relationships: { [name: string]: ODataModel | ODataCollection<ODataModel> }

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
    this.query = query;
    let Ctor = <typeof ODataModel>this.constructor;
    Ctor.schema.deserialize(this, attrs, this.query.clone());
    Ctor.schema.relationships(this, attrs, this.query.clone());
    return this;
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

  fetch(): Observable<this> {
    let query: ODataEntityRequest<ODataModel> | ODataNavigationPropertyRequest<ODataModel> = this.query.clone();
    if (query instanceof ODataEntityRequest) {
      if (this.isNew())
        throw new Error(`Can't fetch without entity key`);
      query.key(this.resolveKey());
    }
    return query.get({responseType: 'entity'})
      .pipe(
        map(entity => entity ? this.assign(entity, query) : this)
      );
  }

  private save(): Observable<this> {
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
          q.delete(attrs[ODataClient.ODATA_ETAG])
            .pipe(map(resp =>
              Object.assign(attrs, { [ODataClient.ODATA_ETAG]: resp[ODataClient.ODATA_ETAG] })
            ))
        ));
      } else {
        // Create
        let target = model.query.clone() as ODataEntityRequest<ODataModel>;
        target.key(model.resolveKey())
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          ref.put(target, attrs[ODataClient.ODATA_ETAG])
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

  destroy(): Observable<any> {
    if (this.isNew())
      throw new Error(`Can't destroy without entity key`);
    let query = this.query.clone() as ODataEntityRequest<ODataModel>;
    query.key(this.resolveKey());
    return query.delete(this[ODataClient.ODATA_ETAG]);
  }

  // Mutate query
  select(select?: string | string[]) {
    return (this.query as ODataEntityRequest<ODataModel>).select(select);
  }

  expand(expand?: Expand) {
    return (this.query as ODataEntityRequest<ODataModel>).expand(expand);
  }
}
