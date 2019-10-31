import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { ODataEntityResource, Expand } from '../resources';

import { ODataModelCollection } from './collection';
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

export class ODataModel {
  // Statics
  query: ODataEntityResource<any> | ODataNavigationPropertyResource<any>;
  state: State;
  relationships: { [name: string]: ODataModel | ODataModelCollection<ODataModel> }

  constructor(entity: any, query: ODataEntityResource<any> | ODataNavigationPropertyResource<any>) {
    this.assign(entity, query);
  }

  setState(state: State) {
    this.state = state;
  }

  assign(entity: any, query: ODataEntityResource<any> | ODataNavigationPropertyResource<any>) {
    Object.assign(this, entity);
    this.query = query;
    return this;
  }

  toJSON(): PlainObject {
    return this.query.getParser().toJSON(this as any);
  }

  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toJSON(), this.query.clone() as ODataEntityResource<any> | ODataNavigationPropertyResource<any>);
  }

  fetch(): Observable<this> {
    let query: ODataEntityResource<any> | ODataNavigationPropertyResource<any> = this.query.clone<any>() as ODataEntityResource<any> | ODataNavigationPropertyResource<any>;
    query.key(this);
    if (query.isNew())
      throw new Error(`Can't fetch without entity key`);
    return query.get({responseType: 'entity'})
      .pipe(
        map(entity => entity ? this.assign(entity, query) : this)
      );
  }

  private save(): Observable<this> {
    let query = this.query.clone() as ODataEntityResource<any>;
    let obs$ = of(this.toJSON());
    let changes = Object.keys(this.relationships)
      .filter(k => this.relationships[k] === null || this.relationships[k] instanceof ODataModel);
    changes.forEach(name => {
      let model = this.relationships[name] as ODataModel;
      let q = query.clone() as ODataEntityResource<any>;
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
        let target = model.query.clone() as ODataEntityResource<any>;
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
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.post(attrs)));
    } else {
      query.key(this);
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.put(attrs, attrs[ODATA_ETAG])));
    }
    return obs$.pipe(
      map(attrs => { console.log(attrs); this.assign(attrs, query); return this; })
    );
  }

  destroy(): Observable<any> {
    let query = this.query.clone() as ODataEntityResource<any>;
    if (query.isNew())
      throw new Error(`Can't destroy without entity key`);
    query.key(this);
    return query.delete(this[ODATA_ETAG]);
  }

  // Mutate query
  select(select?: string | string[]) {
    return (this.query as ODataEntityResource<any>).select(select);
  }

  expand(expand?: Expand) {
    return (this.query as ODataEntityResource<any>).expand(expand);
  }
}
