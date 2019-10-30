import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { ODataEntityResource, Expand } from '../resources';

import { ModelCollection } from './collection';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';
import { ODATA_ETAG } from '../types';
import { PlainObject } from '../types';

enum State {
  Added,
  Modified,
  Deleted,
  Unchanged,
  Detached
}

export class Model<T> {
  // Statics
  query: ODataEntityResource<T> | ODataNavigationPropertyResource<T>;
  state: State;
  relationships: { [name: string]: Model<any> | ModelCollection<any, Model<any>> }

  constructor(entity: T, query: ODataEntityResource<T> | ODataNavigationPropertyResource<T>) {
    this.assign(entity, query);
  }

  setState(state: State) {
    this.state = state;
  }

  assign(entity: T, query: ODataEntityResource<T> | ODataNavigationPropertyResource<T>) {
    Object.assign(this, entity);
    this.query = query;
    return this;
  }

  toJSON(): PlainObject {
    return this.query.getParser().toJSON(this as any);
  }

  clone() {
    let Ctor = <typeof Model>this.constructor;
    return new Ctor(this.toJSON(), this.query.clone() as ODataEntityResource<T> | ODataNavigationPropertyResource<T>);
  }

  fetch(): Observable<this> {
    let query: ODataEntityResource<T> | ODataNavigationPropertyResource<T> = this.query.clone<T>() as ODataEntityResource<T> | ODataNavigationPropertyResource<T>;
    query.key(this);
    if (query.isNew())
      throw new Error(`Can't fetch without entity key`);
    return query.get({responseType: 'entity'})
      .pipe(
        map(entity => entity ? this.assign(entity, query) : this)
      );
  }

  private save(): Observable<this> {
    let query = this.query.clone() as ODataEntityResource<T>;
    let obs$ = of(this.toJSON());
    let changes = Object.keys(this.relationships)
      .filter(k => this.relationships[k] === null || this.relationships[k] instanceof Model);
    changes.forEach(name => {
      let model = this.relationships[name] as Model<any>;
      let q = query.clone() as ODataEntityResource<T>;
      q.key(this);
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
        let target = model.query.clone() as ODataEntityResource<T>;
        target.key(model)
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          ref.put(target, attrs[ODATA_ETAG])
            .pipe(map(resp =>
              Object.assign(attrs, { [ODATA_ETAG]: resp[ODATA_ETAG] })
            ))
        ));
      }
    });
    if (query.isNew()) {
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.post(attrs as T)));
    } else {
      query.key(this);
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.put(attrs as T, attrs[ODATA_ETAG])));
    }
    return obs$.pipe(
      map(attrs => { console.log(attrs); this.assign(attrs as T, query); return this; })
    );
  }

  destroy(): Observable<any> {
    let query = this.query.clone() as ODataEntityResource<T>;
    if (query.isNew())
      throw new Error(`Can't destroy without entity key`);
    query.key(this);
    return query.delete(this[ODATA_ETAG]);
  }

  // Mutate query
  select(select?: string | string[]) {
    return (this.query as ODataEntityResource<T>).select(select);
  }

  expand(expand?: Expand) {
    return (this.query as ODataEntityResource<T>).expand(expand);
  }
}
