import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { PlainObject, Expand, ODataEntityRequest, ODataRequest } from '../odata-request';

import { ODataClient } from '../client';
import { ModelCollection } from './collection';
import { ODataNavigationPropertyRequest } from '../odata-request/requests/navigationproperty';
import { Enums } from '../utils/enums';
import { Schema, Field, Key } from './schema';
import { ODataSettings } from '../settings';

interface ModelKey extends Key {
}

interface ModelField extends Field {
  enum?: {[key: number]: string | number};
  model?: { new(attrs: PlainObject, query: ODataRequest): Model };
  collection?: { new(models: PlainObject[], query: ODataRequest): ModelCollection<Model> };
}

const PARSERS = {
  'string': (value) => String(value),
  'number': (value) => Number(value),
  'boolean': (value) => Boolean(value),
  'Date': (value) => new Date(value),
};

export class ModelSchema<M> extends Schema<ModelKey, ModelField, M> {
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

  serialize(model: Model) {
    return this.properties.filter(f => f.name in model).reduce((acc, f) => 
      Object.assign(acc, {[f.name]: this.toJSON(f, model[f.name])}), 
      {});
  }

  deserialize(model: Model, attrs: PlainObject, query: ODataRequest) {
    Object.assign(model, this.properties.filter(f => f.name in attrs).reduce((acc, f) => 
      Object.assign(acc, {[f.name]: this.parse(f, attrs[f.name], query)}), 
      {})
    );
  }

  relationships(model: Model, attrs: PlainObject, query: ODataRequest) {
    let parse = this.parse;
    model.relationships = {};
    this.navigations.forEach(field => {
      Object.defineProperty(model, field.name, {
        get() {
          if (!(field.name in this.relationships)) {
            let query: ODataEntityRequest<Model> | ODataNavigationPropertyRequest<Model> = this.query.clone();
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
        set(value: Model | null) {
          if (field.isCollection)
            throw new Error(`Can't set ${field.name} to collection, use add`);
          if (!((value as Model).query instanceof ODataEntityRequest))
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

enum State {
  Added,
  Modified,
  Deleted,
  Unchanged,
  Detached
}

export class Model {
  // Statics
  static schema: ModelSchema<Model> = null;
  query: ODataRequest;
  state: State;
  relationships: { [name: string]: Model | ModelCollection<Model> }

  constructor(attrs: PlainObject, query: ODataRequest) {
    this.assign(attrs, query);
  }

  setState(state: State) {
    this.state = state;
  }

  isNew() {
    let Ctor = <typeof Model>this.constructor;
    return Ctor.schema.isNew(this);
  }

  assign(attrs: PlainObject, query: ODataRequest) {
    this.query = query;
    let Ctor = <typeof Model>this.constructor;
    Ctor.schema.deserialize(this, attrs, this.query.clone());
    Ctor.schema.relationships(this, attrs, this.query.clone());
    return this;
  }

  resolveKey() {
    let Ctor = <typeof Model>this.constructor;
    return Ctor.schema.resolveKey(this);
  }

  toJSON() {
    let Ctor = <typeof Model>this.constructor;
    return Ctor.schema.serialize(this);
  }

  clone() {
    let Ctor = <typeof Model>this.constructor;
    return new Ctor(this.toJSON(), this.query.clone());
  }

  fetch(): Observable<this> {
    let query: ODataEntityRequest<Model> | ODataNavigationPropertyRequest<Model> = this.query.clone();
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
    let query = this.query.clone() as ODataEntityRequest<Model>;
    let obs$ = of(this.toJSON());
    let changes = Object.keys(this.relationships)
      .filter(k => this.relationships[k] === null || this.relationships[k] instanceof Model);
    changes.forEach(name => {
      let model = this.relationships[name] as Model;
      let q = query.clone() as ODataEntityRequest<Model>;
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
        let target = model.query.clone() as ODataEntityRequest<Model>;
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
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.post(attrs as Model)));
    } else {
      let key = this.resolveKey();
      query.key(key);
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.put(attrs as Model, attrs[ODataClient.ODATA_ETAG])));
    }
    return obs$.pipe(
      map(attrs => { console.log(attrs); this.assign(attrs, query); return this; })
    );
  }

  destroy(): Observable<any> {
    if (this.isNew())
      throw new Error(`Can't destroy without entity key`);
    let query = this.query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    return query.delete(this[ODataClient.ODATA_ETAG]);
  }

  // Mutate query
  select(select?: string | string[]) {
    return (this.query as ODataEntityRequest<Model>).select(select);
  }

  expand(expand?: Expand) {
    return (this.query as ODataEntityRequest<Model>).expand(expand);
  }
}
