import { Observable } from 'rxjs';
import { map, throwIfEmpty } from 'rxjs/operators';

import { ODataEntityResource, Expand, ODataPropertyResource, ODataEntityAnnotations, ODataPropertyAnnotations, ODataRelatedAnnotations, ODataFunctionResource, ODataActionResource, ODataResource, ODataAnnotations } from '../resources';

import { ODataModelCollection } from './collection';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';
import { PlainObject } from '../types';

export class ODataModel {
  _resource: ODataResource<any>;
  _annotations: ODataAnnotations;
  _relationships: { [name: string]: ODataModel | ODataModelCollection<ODataModel> }

  constructor(attrs?: any, resource?: ODataResource<any>) {
    this.attach(attrs || {}, resource);
  }

  attach(entity: any, resource?: ODataResource<any>, annots?: ODataAnnotations): this {
    this._resource = resource;
    this._annotations = annots;
    this._relationships = {};
    if (this._resource) {
      let schema = this._resource.schema();
      schema.fields.forEach(field => {
        if (field.schema) {
          if (field.navigation) {
            Object.defineProperty(this, field.name, {
              get() {
                if (!(field.name in this._relationships)) {
                  this._resource.key(this);
                  if (!this._resource.hasKey()) {
                    throw new Error(`Can't resolve ${field.name} relation from new entity`);
                  }
                    let nav = (this._resource as ODataEntityResource<any>).navigationProperty<any>(field.name);
                    let annots = this._annotations ? this._annotations.related(field.name) : undefined;
                    let rel = field.collection ? nav.toCollection(entity[field.name], annots) : nav.toModel(entity[field.name], annots);
                    this._relationships[field.name] = rel;
                }
                return this._relationships[field.name];
              },
              set(value: ODataModel | null) {
                if (field.collection)
                  throw new Error(`Can't set ${field.name} to collection, use add`);
                if (!(value._resource instanceof ODataEntityResource))
                  throw new Error(`Can't set ${value} to model`);
                this._relationships[field.name] = value;
              }
            });
          } else {
            let prop = (this._resource as ODataEntityResource<any>).property(field.name);
            let annots = this._annotations ? this._annotations.related(field.name) : undefined;
            let rel = field.collection ? prop.toCollection(entity[field.name], annots) : prop.toModel(entity[field.name], annots);
            this._relationships[field.name] = rel;
          }
        } else if (entity[field.name] !== undefined) {
          this[field.name] = entity[field.name];
        }
      });
    } else {
      Object.assign(this, entity);
    }
    return this;
  }

  toJSON() {
    let entity = {};
    let schema = this._resource.schema();
    schema.fields.forEach(field => {
      if (field.schema) {
        if (field.navigation) {
          if (field.name in this._relationships) {
            entity[field.name] = this._relationships[field.name].toJSON();
          }
        } else {
          if (this[field.name] !== undefined) {
            entity[field.name] = this[field.name].toJSON();
          }
        }
      } else if (this[field.name] !== undefined) {
        entity[field.name] = this[field.name];
      }
    });
    return this._resource.serialize(entity);
  }

  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return (new Ctor()).attach(this.toJSON(), this._resource.clone(), this._annotations);
  }

  fetch(): Observable<this | null> {
    let resource: ODataEntityResource<any> | ODataPropertyResource<any> | ODataNavigationPropertyResource<any> = this._resource.clone<any>() as ODataEntityResource<any> | ODataNavigationPropertyResource<any>;
    if (resource instanceof ODataEntityResource) {
      resource.key(this);
      if (resource.key())
        throw new Error(`Can't fetch without entity key`);
    }
    return resource.get({ responseType: 'entity' })
      .pipe(
        map(([entity, annots]) => entity ? this.attach(entity, resource, annots) : null));
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
    if (this._annotations && this._annotations.context) {
      resource.key(this);
      return resource.put(this.toJSON())
        .pipe(map(([entity, annots]) => this.attach(entity, resource, annots)));
    } else {
      return resource.post(this.toJSON())
        .pipe(map(([entity, annots]) => this.attach(entity, resource, annots)));
    }
  }

  destroy(): Observable<any> {
    let resource = this._resource.clone() as ODataEntityResource<any>;
    if (resource instanceof ODataEntityResource) {
      resource.key(this);
      if (resource.hasKey()) {
        let etag = (this._annotations as ODataEntityAnnotations).etag;
        return resource.delete({ etag });
      }
    }
    throw new Error(`Can't destroy without entity and key`);
  }

  // Custom
  protected function<R>(name: string, params: any, returnType?: string): ODataFunctionResource<R> {
    let resource = this._resource.clone() as ODataEntityResource<any>;
    if (resource instanceof ODataEntityResource) {
      resource.key(this);
      if (resource.hasKey()) {
        var func = resource.function<R>(name, returnType);
        func.parameters(params);
        return func;
      }
    }
  }

  protected action<R>(name: string, returnType?: string): ODataActionResource<R> {
    let resource = this._resource.clone() as ODataEntityResource<any>;
    if (resource instanceof ODataEntityResource) {
      resource.key(this);
      if (resource.hasKey()) {
        return resource.action<R>(name, returnType);
      }
    }
  }

  // Mutate query
  select(select?: string | string[]) {
    return (this._resource as ODataEntityResource<any>).select(select);
  }

  expand(expand?: Expand) {
    return (this._resource as ODataEntityResource<any>).expand(expand);
  }
}
