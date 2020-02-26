import { Observable, NEVER } from 'rxjs';
import { map, throwIfEmpty } from 'rxjs/operators';

import { ODataEntityResource, Expand, ODataPropertyResource, ODataEntityAnnotations, ODataPropertyAnnotations, ODataRelatedAnnotations, ODataFunctionResource, ODataActionResource, ODataResource, ODataAnnotations, Select } from '../resources';

import { ODataCollection } from './collection';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';

export class ODataModel<T> {
  _resource: ODataResource<T>;
  _entity: T;
  _annotations: ODataAnnotations | null;
  _relationships: { [name: string]: ODataModel<any> | ODataCollection<any, ODataModel<any>> }

  constructor(resource: ODataResource<T>, entity?: Partial<T>, annots?: ODataAnnotations) {
    this._resource = resource;
    this._resource.schema().fields
      .filter(field => field.schema && field.navigation)
      .forEach(field => {
        Object.defineProperty(this, field.name, {
          get() {
            if (!(field.name in this._relationships)) {
              this._resource.key(this.toEntity());
              if (!this._resource.hasKey()) {
                throw new Error(`Can't resolve ${field.name} relation from new entity`);
              }
              let nav = (this._resource as ODataEntityResource<T>).navigationProperty<T>(field.name);
              let annots = this._annotations !== null ? this._annotations.related(field.name) : undefined;
              let rel = field.collection ? nav.toCollection(this._entity[field.name], annots) : nav.toModel(this._entity[field.name], annots);
              this._relationships[field.name] = rel;
            }
            return this._relationships[field.name];
          },
          set(value: ODataModel<any> | null) {
            if (field.collection)
              throw new Error(`Can't set ${field.name} to collection, use add`);
            if (!(value._resource instanceof ODataEntityResource))
              throw new Error(`Can't set ${value} to model`);
            this._relationships[field.name] = value;
          }
        });
      });
    this.populate((entity || {}) as T, annots || null);
  }

  attach(resource: ODataResource<T>) {
    if (this._resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this._resource.type()}`);
    this._resource = resource;
    return this;
  }

  private populate(entity: T, annots?: ODataAnnotations | null) {
    this._entity = entity;
    this._annotations = annots;
    this._relationships = {};
    let schema = this._resource.schema();
    let entries = Object.entries(entity)
      .map(([key, value]) => [key, value, schema.fields.find(f => f.name === key)]);
      //Attributes
    let attrs = entries
      .filter(([k, v, f]) => f)
      .reduce((acc, [k, v, f]) => Object.assign(acc, {[k]: v}), {});
    Object.assign(this, attrs);
      //Others
    let others = entries
      .filter(([k, v, f]) => !f)
      .reduce((acc, [k, v, f]) => Object.assign(acc, {[k]: v}), {});
    Object.assign(this, others);
      //Complexes
    let complexes = entries
      .filter(([k, v, f]) => f && !f.navigation && f.schema)
      .reduce((acc, [k, v, f]) => {
        let prop = (this._resource as ODataEntityResource<T>).property(f.name);
        let annots = this._annotations !== null ? this._annotations.related(f.name) : undefined;
        let complex = f.collection ? prop.toCollection(this._entity[f.name], annots) : prop.toModel(this._entity[f.name], annots);
        return Object.assign(acc, {[k]: complex});
      } , {});
    Object.assign(this, complexes);
    return this;
  }

  toEntity() : T {
    let entity = {} as T;
    let schema = this._resource.schema();
    schema.fields.forEach(field => {
      if (field.schema) {
        if (field.navigation) {
          if (field.name in this._relationships) {
            var rel = this._relationships[field.name];
            entity[field.name] = (rel instanceof ODataModel)? rel.toEntity() : rel.toEntities();
          }
        } else {
          if (this[field.name] !== undefined) {
            entity[field.name] = this[field.name].toEntity();
          }
        }
      } else if (this[field.name] !== undefined) {
        entity[field.name] = this[field.name];
      }
    });
    return entity;
  }

  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return (new Ctor(this._resource.clone(), this.toEntity(), this._annotations));
  }

  fetch(): Observable<this | null> {
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this.toEntity());
      if (!this._resource.hasKey())
        throw new Error(`Can't fetch entity without key`);
      obs$ = this._resource.get();
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      obs$ = this._resource.get({ responseType: 'entity' });
    } else if (this._resource instanceof ODataPropertyResource) {
      obs$ = this._resource.get({ responseType: 'property' });
    } else if (this._resource instanceof ODataFunctionResource) {
      obs$ = this._resource.get({ responseType: 'entity' });
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(
      map(([entity, annots]) => entity ? this.populate(entity, annots) : null));
  }

  save(): Observable<this> {
    /*
    let obs$ = of(this.toEntity());
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
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this.toEntity());
      if (this._resource.hasKey()) {
        let etag = (this._annotations && this._annotations instanceof ODataEntityAnnotations) ? this._annotations.etag : undefined;
        obs$ = this._resource.put(this.toEntity(), {etag});
      } else {
        obs$ = this._resource.post(this.toEntity());
      }
      return obs$.pipe(map(([entity, annots]) => this.populate(entity, annots)));
    }
    throw new Error(`Can't save`);
  }

  destroy(): Observable<any> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this.toEntity());
      if (!this._resource.hasKey())
        throw new Error(`Can't destroy entity without key`);
      let etag = (this._annotations && this._annotations instanceof ODataEntityAnnotations) ? this._annotations.etag : undefined;
      return this._resource.delete({ etag });
    }
    throw new Error(`Can't destroy`);
  }

  // Custom
  protected function<R>(name: string, params: any, returnType?: string): ODataFunctionResource<R> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this.toEntity());
      if (this._resource.hasKey()) {
        var func = this._resource.function<R>(name, returnType);
        func.parameters(params);
        return func;
      }
    }
    throw new Error(`Can't function without resource or entity key`);
  }

  protected action<R>(name: string, returnType?: string): ODataActionResource<R> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this.toEntity());
      if (this._resource.hasKey()) {
        return this._resource.action<R>(name, returnType);
      }
    }
    throw new Error(`Can't action without resource or entity key`);
  }

  // Mutate query
  select(select?: Select<T>) {
    return (this._resource as ODataEntityResource<T>).select(select);
  }

  expand(expand?: Expand<T>) {
    return (this._resource as ODataEntityResource<T>).expand(expand);
  }
}
