import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
  ODataResource,
  ODataEntityResource,
  ODataPropertyResource,
  ODataFunctionResource
} from '../resources';

import { ODataCollection } from './collection';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';
import {
  HttpOptions,
  HttpEntityOptions
} from '../resources/requests/options';
import { ODataMeta, ODataEntityMeta, ODataEntitiesMeta } from '../resources/responses/meta';
import { ODataEntityConfig } from '../config';
import { ODataFieldParser } from '../parsers/entity';
import { OData } from '../utils';
import { DEFAULT_VERSION } from '../constants';

export class ODataModel<T> {
  protected _resource: ODataResource<T>;
  protected _entity: T;
  protected _meta: ODataMeta;
  protected _relations: { [name: string]: { 
    rel: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null,
    field: ODataFieldParser<any>
  }}

  constructor(entity?: any, options: { resource?: ODataResource<T>, meta?: ODataMeta } = {}) {
    if (options.resource instanceof ODataResource)
      this.attach(options.resource);
    this.populate((entity || {}), options.meta);
  }

  attach(resource: ODataResource<T>) {
    if (this._resource && this._resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this._resource.type()}`);
    let first = !this._resource;
    this._resource = resource;
    if (first) {
      (this._resource as ODataEntityResource<T>).config().fields()
        .filter(field => field.navigation)
        .forEach(field => {
          Object.defineProperty(this, field.name, {
            get() {
              return this.getNavigationProperty(field);
            },
            set(model: ODataModel<any> | null) {
              this.setNavigationProperty(field, model);
            }
          });
        });
      if (this._entity)
        this.populate(this._entity, this._meta);
    }
    return this;
  }

  target() {
    return this._resource.clone() as ODataResource<T>;
  }

  protected parse(entity: T) {
    let fields = this._resource ? (this._resource as ODataEntityResource<T>).config().fields() : [];
    let entries = Object.entries(entity)
      .map(([key, value]) => [key, value, fields.find(f => f.name === key)]);
    //Attributes
    let attrs = Object.assign({}, entries
      .filter(([, , f]) => f && !(f.isNavigation() || f.isComplexType()))
      .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {}));
    //Others
    Object.assign(attrs, entries
      .filter(([, , f]) => !f)
      .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {}));
    //Complexes
    Object.assign(attrs, entries
      .filter(([, , f]) => f && f.isComplexType())
      .reduce((acc, [k, , f]) => {
        let value = this._entity[f.name];
        if (value) {
          let prop = (this._resource as ODataEntityResource<T>).property<any>(f.name);
          value = f.collection ? 
            prop.collection(value, new ODataEntitiesMeta(this._meta.property(f.name))) : 
            prop.model(value, new ODataEntityMeta(value));
        }
        return Object.assign(acc, { [k]: value });
      }, {}));
    return attrs;
  }

  protected populate(entity: any, meta?: ODataMeta) {
    this._entity = OData[DEFAULT_VERSION].attributes(entity) as T;
    this._meta = meta || new ODataEntityMeta(entity);
    this._relations = {};
    Object.assign(this, this.parse(this._entity));
    return this;
  }

  toEntity(): T {
    return Object.entries(
      Object.assign({}, 
        this._entity, 
        Object.entries(this)
          .filter(([key, ]) => !(key.startsWith("_")))
          .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {}),
        Object.entries(this._relations).reduce((acc, [k, v]) => Object.assign(acc, {[k]: v.rel}), {})
      )
    ).reduce((acc, [k, value]) => 
      Object.assign(acc, { [k]: (value instanceof ODataModel) ? 
        value.toEntity() : 
        (value instanceof ODataCollection) ?
        value.toEntities() : value }), 
      {}) as T;
  }

  clone<Mo extends ODataModel<T>>() {
    let Ctor = <typeof ODataModel>this.constructor;
    return (new Ctor(this.toEntity(), { resource: this._resource.clone(), meta: this._meta })) as Mo;
  }

  fetch(options?: HttpOptions): Observable<this | null> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't fetch entity without key`);
      return this._resource.get(options).pipe(
        map(({entity, meta}) => entity ? this.populate(entity, meta) : null));
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      return this._resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})).pipe(
          map(({entity, meta}) => entity ? this.populate(entity, meta) : null));
    } else if (this._resource instanceof ODataPropertyResource) {
      return this._resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})).pipe(
          map(({entity, meta}) => entity ? this.populate(entity, meta) : null));
    } else if (this._resource instanceof ODataFunctionResource) {
      return this._resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})).pipe(
          map(({entity, meta}) => entity ? this.populate(entity, meta) : null));
    }
    throw new Error("Not Yet!");
  }

  create(options?: HttpOptions): Observable<this> {
    if (this._resource instanceof ODataEntityResource) {
      let entity = this.toEntity(); 
      return this._resource.post(entity, options).pipe(map(({entity, meta}) => this.populate(entity, meta)));
    }
    throw new Error(`Can't create`);
  }

  update(options?: HttpOptions): Observable<this> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't update entity without key`);
      let resource = this._resource;
      let etag = (this._meta && this._meta instanceof ODataEntityMeta) ? this._meta.etag : undefined;
      let entity = this.toEntity(); 
      let rels = Object.values(this._relations)
            .filter((value) => value.field.navigation && !value.field.collection)
            .map((value) => {
              let ref = (this._resource as ODataEntityResource<T>).navigationProperty<any>(value.field.name).reference();
              delete entity[value.field.name];
              return value.rel != null ? 
                ref.set(value.rel.target() as ODataEntityResource<any>, {etag}) : 
                ref.unset({etag})
            });
      return forkJoin(rels).pipe(
        switchMap(() => resource.put(entity, Object.assign({ etag }, options || {}))),
        map(({entity, meta}) => this.populate(entity, meta)));
    }
    throw new Error(`Can't update`);
  }

  save(options?: HttpOptions): Observable<this> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      return this._resource.segment.key().empty() ? this.create(options) : this.update(options);
    }
    throw new Error(`Can't save`);
  }

  destroy(options?: HttpOptions): Observable<null> {
    if (this._resource instanceof ODataEntityResource) {
      let etag = (this._meta && this._meta instanceof ODataEntityMeta) ? this._meta.etag : undefined;
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't destroy entity without key`);
      return this._resource.delete(Object.assign({ etag }, options || {}));
    }
    throw new Error(`Can't destroy`);
  }

  get _segment() {
    if (!this._resource)
      throw new Error(`Can't call without ODataResource`);
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't use without key`);
    }
    return (this._resource as ODataEntityResource<T>).segment;
    /*
    return {
      // Function
      function<R>(name: string, returnType?: string): ODataFunctionResource<R> { return resource.function<R>(name, returnType); },
      // Action
      action<R>(name: string, returnType?: string): ODataActionResource<R> { return resource.action<R>(name, returnType); },
      // Navigation
      navigationProperty<P>(name: string): ODataNavigationPropertyResource<P> { return resource.navigationProperty<P>(name); }
    };
    */
  }

  get _query() {
    if (!this._resource)
      throw new Error(`Can't query without ODataResource`);
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't query without key`);
    }
    return (this._resource as ODataEntityResource<T>).query;
  }

  protected getNavigationProperty<P>(field: ODataFieldParser<any>): ODataModel<P> | ODataCollection<P, ODataModel<P>> {
    if (!(field.name in this._relations)) {
      let value = this._entity[field.name];
      let nav = (this._resource as ODataEntityResource<T>).navigationProperty<P>(field.name);
      let rel = field.collection ? 
        nav.collection(value, new ODataEntitiesMeta(this._meta.property(field.name))) : 
        nav.model(value, new ODataEntityMeta(value));
      this._relations[field.name] = {field, rel};
    }
    return this._relations[field.name].rel;
  }

  protected setNavigationProperty<P, Pm extends ODataModel<P>>(field: ODataFieldParser<any>, model: Pm | null) {
    if (field.collection)
      throw new Error(`Can't set ${field.name} to collection, use add`);
    if (model instanceof ODataModel && model.target().type() !== field.type)
      throw new Error(`Can't set ${model.target().type()} to ${field.type}`);
    this._relations[field.name] = {rel: model, field};
  }
}
