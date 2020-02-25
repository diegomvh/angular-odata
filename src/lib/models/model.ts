import { Observable } from 'rxjs';
import { map, throwIfEmpty } from 'rxjs/operators';

import { ODataEntityResource, Expand, ODataPropertyResource, ODataEntityAnnotations, ODataPropertyAnnotations, ODataRelatedAnnotations, ODataFunctionResource, ODataActionResource, ODataResource, ODataAnnotations, Select } from '../resources';

import { ODataCollection } from './collection';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';

export class ODataModel<T> {
  _entity: T;
  _resource: ODataResource<T>;
  _annotations: ODataAnnotations;
  _relationships: { [name: string]: ODataModel<any> | ODataCollection<any, ODataModel<any>> }

  attach(resource: ODataResource<T>) {
    if (this._resource && this._resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this._resource.type()}`);
    if (!this._resource) {
      resource.schema().fields
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
                let annots = this._annotations ? this._annotations.related(field.name) : undefined;
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
    }
    this._resource = resource;
    return this;
  }

  populate(entity: T, annots?: ODataAnnotations) {
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
        let annots = this._annotations ? this._annotations.related(f.name) : undefined;
        let complex = f.collection ? prop.toCollection(this._entity[f.name], annots) : prop.toModel(this._entity[f.name], annots);
        return Object.assign(acc, {[k]: complex});
      } , {});
    Object.assign(this, complexes);
    return this;
  }
  /*
  attach(resource: ODataResource<T>): this {
    if (!this._resource) {
          } else {
          }
        } else if (this._entity[field.name] !== undefined) {
          this[field.name] = this._entity[field.name];
        }
      });
      this._resource = resource;
    } else {
      Object.assign(this, entity);
    }
    return this;
  }
  */

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
    return (new Ctor()).attach(this._resource.clone()).populate(this.toEntity(), this._annotations);
  }

  fetch(): Observable<this | null> {
    if (!this._resource) {
      throw new Error(`Can't fetch without resource`);
    } else if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this.toEntity());
      if (this._resource.hasKey()) {
        return this._resource.get()
          .pipe(
            map(([entity, annots]) => entity ? this.populate(entity, annots) : null));
      }
      throw new Error(`Can't fetch entity without entity key`);
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      return this._resource.get({ responseType: 'entity' })
        .pipe(
          map(([entity, annots]) => entity ? this.populate(entity, annots) : null));
    }
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
    if (this._annotations && this._annotations.context) {
      (this._resource as ODataEntityResource<T>).key(this.toEntity());
      return (this._resource as ODataEntityResource<T>).put(this.toEntity())
        .pipe(map(([entity, annots]) => this.populate(entity, annots)));
    } else {
      return (this._resource as ODataEntityResource<any>).post(this.toEntity())
        .pipe(map(([entity, annots]) => this.populate(entity, annots)));
    }
  }

  destroy(): Observable<any> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this.toEntity());
      if (this._resource.hasKey()) {
        let etag = (this._annotations as ODataEntityAnnotations).etag;
        return this._resource.delete({ etag });
      }
    }
    throw new Error(`Can't destroy without resource or entity key`);
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
