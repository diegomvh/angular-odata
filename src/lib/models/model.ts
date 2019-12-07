import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataEntityResource, Expand, ODataPropertyResource, ODataEntityAnnotations, ODataPropertyAnnotations, ODataRelatedAnnotations } from '../resources';

import { ODataModelCollection } from './collection';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';
import { ODATA_ETAG } from '../types';
import { PlainObject } from '../types';
import { ODataSettings } from './settings';

type ODataModelResource<T> = ODataEntityResource<any> | ODataPropertyResource<any> | ODataNavigationPropertyResource<any>;
type ODataModelAnnotations = ODataEntityAnnotations | ODataPropertyAnnotations | ODataRelatedAnnotations;

enum State {
  Added,
  Modified,
  Deleted,
  Unchanged,
  Detached
}

export class ODataModel {
  _settings: ODataSettings; 
  _resource: ODataModelResource<any>;
  _annotations: ODataModelAnnotations;
  _state: State;
  _relationships: { [name: string]: ODataModel | ODataModelCollection<ODataModel> }

  constructor(
    entity: any | null, 
    annots: ODataModelAnnotations | null,
    resource: ODataModelResource<any>, 
    settings: ODataSettings
  ) {
    this._settings = settings;
    this.assign(entity || {}, annots, resource);
  }

  private setState(state: State) {
    this._state = state;
  }

  private assign(entity: any, 
    annots: ODataModelAnnotations, 
    resource: ODataModelResource<any>): this {
    this._annotations = annots;
    this._resource = resource;
    this._relationships = {};
    var schema = this._settings.schemaForType(this._resource.type());
    schema.fields.forEach(field => {
      let Klass = field.many ? this._settings.collectionForType(field.type) : this._settings.modelForType(field.type);
      if (field.navigation) {
        Object.defineProperty(this, field.name, {
          get() {
            if (!(field.name in this._relationships)) {
              let resource: ODataModelResource<any> = this._resource.clone();
              if (resource instanceof ODataEntityResource && resource.isNew()) {
                throw new Error(`Can't resolve ${field.name} relation from new entity`);
              }
              let nav = (resource as ODataEntityResource<any>).navigationProperty<any>(field.name);
              this._relationships[field.name] = new Klass(
                field.parse(entity[field.name] || null), 
                this._annotations.related(field.name),
                nav, 
                this._settings
              );
            }
            return this._relationships[field.name];
          },
          set(value: ODataModel | null) {
            if (field.many)
              throw new Error(`Can't set ${field.name} to collection, use add`);
            if (!(value._resource instanceof ODataEntityResource))
              throw new Error(`Can't set ${value} to model`);
            this._relationships[field.name] = value;
            this.setState(State.Modified);
          }
        });
      } else if (Klass) {
        this[field.name] = new Klass(
          entity[field.name], 
          <any>this._annotations.property(field.name), 
          resource.property(field.name), 
          this._settings
        );
      } else if (entity[field.name] !== undefined) {
        this[field.name] = entity[field.name];
      }
    });
    return this;
  }

  toJSON(): PlainObject {
    return this._resource.serialize(this);
  }

  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    let resource = this._resource.clone() as ODataEntityResource<any> | ODataNavigationPropertyResource<any>;
    return new Ctor(this.toJSON(), this._annotations.clone(), resource, this._settings);
  }

  fetch(): Observable<this | null> {
    let resource: ODataEntityResource<any> | ODataPropertyResource<any> | ODataNavigationPropertyResource<any> = this._resource.clone<any>() as ODataEntityResource<any> | ODataNavigationPropertyResource<any>;
    if (resource instanceof ODataEntityResource) {
      resource.key(this);
      if (resource.isNew())
        throw new Error(`Can't fetch without entity key`);
    }
    return resource.get({responseType: 'entity'})
      .pipe( 
        map(([entity, annots]) => entity ? this.assign(entity, annots, resource) : null));
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
        .pipe(map(([entity, annots]) => {
          this.assign(entity, annots, resource);
          return this;
        }) );
    } else {
      resource.key(this);
      return resource.put(this)
        .pipe( map(([entity, annots]) => {
          this.assign(entity, annots, resource);
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
    return (this._resource as ODataEntityResource<any>).select(select);
  }

  expand(expand?: Expand) {
    return (this._resource as ODataEntityResource<any>).expand(expand);
  }
}
