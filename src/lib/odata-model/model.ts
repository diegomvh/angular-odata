import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { PlainObject, Expand, ODataEntityRequest, ODataRequest } from '../odata-request';

import { ModelCollection } from './collection';
import { ODataNavigationPropertyRequest } from '../odata-request/requests/navigationproperty';
import { ODATA_ETAG } from '../constants';
import { Schema } from '../odata-request/schema';

enum State {
  Added,
  Modified,
  Deleted,
  Unchanged,
  Detached
}

export class Model {
  // Statics
  static schema: Schema<Model> = null;
  query: ODataRequest<any>;
  state: State;
  relationships: { [name: string]: Model | ModelCollection<Model> }

  constructor(attrs: PlainObject, query: ODataRequest<any>) {
    this.assign(attrs, query);
  }

  setState(state: State) {
    this.state = state;
  }

  isNew() {
    let Ctor = <typeof Model>this.constructor;
    return Ctor.schema.isNew(this);
  }

  assign(attrs: PlainObject, query: ODataRequest<any>) {
    this.query = query;
    let Ctor = <typeof Model>this.constructor;
    Object.assign(this, attrs);
    Ctor.schema.deserialize(this, this.query.clone());
    Ctor.schema.relationships(this, this.query.clone());
    return this;
  }

  resolveKey() {
    let Ctor = <typeof Model>this.constructor;
    return Ctor.schema.resolveKey(this);
  }

  toJSON(): PlainObject {
    let Ctor = <typeof Model>this.constructor;
    return Ctor.schema.serialize(this);
  }

  clone() {
    let Ctor = <typeof Model>this.constructor;
    return new Ctor(this.toJSON(), this.query.clone());
  }

  fetch(): Observable<this> {
    let query: ODataEntityRequest<Model> | ODataNavigationPropertyRequest<Model> = this.query.clone<Model>() as ODataEntityRequest<Model> | ODataNavigationPropertyRequest<Model>;
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
          q.delete(attrs[ODATA_ETAG])
            .pipe(map(resp =>
              Object.assign(attrs, { [ODATA_ETAG]: resp[ODATA_ETAG] })
            ))
        ));
      } else {
        // Create
        let target = model.query.clone() as ODataEntityRequest<Model>;
        target.key(model.resolveKey())
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          ref.put(target, attrs[ODATA_ETAG])
            .pipe(map(resp =>
              Object.assign(attrs, { [ODATA_ETAG]: resp[ODATA_ETAG] })
            ))
        ));
      }
    });
    if (this.isNew()) {
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.post(attrs as Model)));
    } else {
      let key = this.resolveKey();
      query.key(key);
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.put(attrs as Model, attrs[ODATA_ETAG])));
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
    return query.delete(this[ODATA_ETAG]);
  }

  // Mutate query
  select(select?: string | string[]) {
    return (this.query as ODataEntityRequest<Model>).select(select);
  }

  expand(expand?: Expand) {
    return (this.query as ODataEntityRequest<Model>).expand(expand);
  }
}
