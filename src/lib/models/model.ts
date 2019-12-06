import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
  _resource: ODataEntityResource<any> | ODataNavigationPropertyResource<any> | null;
  _state: State;
  _relationships: { [name: string]: ODataModel | ODataModelCollection<ODataModel> }

  constructor(entity: any) {
    Object.assign(this, entity);
  }

  setState(state: State) {
    this._state = state;
  }

  toJSON(): PlainObject {
    return this._resource.serialize(this);
  }

  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    let model = new Ctor(this.toJSON());
    if (this._resource)
      model.attach(this._resource.clone() as ODataEntityResource<any> | ODataNavigationPropertyResource<any>);
  }

  attach(resource: ODataEntityResource<any> | ODataNavigationPropertyResource<any>) {
    this._resource = resource;
    resource.relationships(this);
  }

  fetch(): Observable<this> {
    let resource: ODataEntityResource<any> | ODataNavigationPropertyResource<any> = this._resource.clone<any>() as ODataEntityResource<any> | ODataNavigationPropertyResource<any>;
    resource.key(this);
    if (resource.isNew())
      throw new Error(`Can't fetch without entity key`);
    return resource.get({responseType: 'entity'})
      .pipe( 
        map(([entity, ]) => {
          Object.assign(this, entity);
          this.attach(resource);
          return this;
        }));
  }

  save(): Observable<this> {
    let resource = this._resource.clone() as ODataEntityResource<any>;
    /*
    let obs$ = of(this.toJSON());
    let changes = Object.keys(this._relationships)
      .filter(k => this._relationships[k] === null || this._relationships[k] instanceof ODataModel);
    changes.forEach(name => {
      let model = this._relationships[name] as ODataModel;
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
        let target = model._query.clone() as ODataEntityResource<any>;
        target.key(model)
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          ref.put(target, attrs[ODATA_ETAG])
            .pipe(map(resp =>
              Object.assign(attrs, { [ODATA_ETAG]: resp[ODATA_ETAG] })
            ))
        ));
      }
    });
    */
    if (resource.isNew()) {
      return resource.post(this)
        .pipe(map(([entity, ]) => {
          Object.assign(this, entity);
          this.attach(resource);
          return this;
        }) );
    } else {
      resource.key(this);
      return resource.put(this)
        .pipe( map(([entity, ]) => {
          Object.assign(this, entity);
          this.attach(resource);
          return this;
        }) );
    }
  }

  destroy(): Observable<any> {
    let resource = this._resource.clone() as ODataEntityResource<any>;
    if (resource.isNew())
      throw new Error(`Can't destroy without entity key`);
    resource.key(this);
    return resource.delete(this[ODATA_ETAG]);
  }

  // Mutate query
  select(select?: string | string[]) {
    return this._resource.select(select);
  }

  expand(expand?: Expand) {
    return this._resource.expand(expand);
  }
}
