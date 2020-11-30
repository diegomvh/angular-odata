import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
  ODataResource,
  ODataEntityResource,
  ODataPropertyResource,
  ODataFunctionResource,
  ODataNavigationPropertyResource,
  HttpOptions,
  HttpEntityOptions,
  ODataEntityMeta,
  ODataEntitiesMeta
} from '../resources/index';

import { ODataCollection } from './collection';
import { ODataFieldParser } from '../parsers/entity';

export class ODataModel<T> {
  protected _resource: ODataResource<T> | null;
  protected _entity: T;
  protected _meta: ODataEntityMeta | null;
  protected _relations: { [name: string]: {
    rel: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null,
    field: ODataFieldParser<any>
  }};

  constructor(data?: any, options: { resource?: ODataResource<T>, meta?: ODataEntityMeta } = {}) {
    this._resource = null;
    this._entity = {} as T;
    this._meta = null;
    this._relations = {};
    if (options.resource instanceof ODataResource)
      this.attach(options.resource);
    this.populate(data || {}, options.meta);
  }

  attach(resource: ODataResource<T>) {
    if (this._resource !== null && this._resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this._resource.type()}`);
    let first = !this._resource;
    this._resource = resource;
    if (first) {
      this._config.fields({include_navigation: true, include_parents: true})
        .filter(field => field.isNavigation())
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
        this.populate(this._entity, this._meta !== null ? this._meta : undefined);
    }
    return this;
  }

  target() {
    return this._resource !== null ? this._resource.clone() as ODataResource<T> : null;
  }

  protected parse(entity: T) {
    let fields = this._resource ? this._config.fields({include_navigation: true, include_parents: true}) : [];
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
        let value = (this._entity as any)[f.name];
        if (value) {
          let prop = (this._resource as ODataEntityResource<T>).property<any>(f.name);
          if (this._meta === null)
            throw("No metadata value");
          value = f.collection ?
            prop.asCollection(value, new ODataEntitiesMeta(this._meta.property(f.name) || {}, {options: this._meta.options})) :
            prop.asModel(value, new ODataEntityMeta(value || {}, {options: this._meta.options}));
        }
        return Object.assign(acc, { [k]: value });
      }, {}));
    return attrs;
  }

  protected populate(data: Object, meta?: ODataEntityMeta) {
    this._meta = meta || new ODataEntityMeta(data, {options: this._resource ? this._resource.api.options : undefined});
    this._entity = this._meta.attributes<T>(data);
    this._relations = {};
    return Object.assign(this, this.parse(this._entity));
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

  clone() {
    let options: {resource?: ODataResource<T>, meta?: ODataEntityMeta} = {};
    if (this._resource)
      options.resource = this._resource.clone();
    if (this._meta)
      options.meta = this._meta.clone();
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toEntity(), options);
  }

  fetch(options?: HttpOptions): Observable<this> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't fetch entity without key`);
      return this._resource.get(options).pipe(
        map(({entity, meta}) => this.populate(entity, meta)));
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      return this._resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})).pipe(
          map(({entity, meta}) => this.populate(entity, meta)));
    } else if (this._resource instanceof ODataPropertyResource) {
      return this._resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})).pipe(
          map(({entity, meta}) => this.populate(entity, meta)));
    } else if (this._resource instanceof ODataFunctionResource) {
      return this._resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})).pipe(
          map(({entity, meta}) => this.populate(entity, meta)));
    }
    throw new Error("Not Yet!");
  }

  create(options?: HttpOptions): Observable<this> {
    if (this._resource instanceof ODataEntityResource) {
      let attrs = this.toEntity();
      return this._resource.post(attrs, options).pipe(
        map(({entity, meta}) => this.populate(entity || attrs, meta)));
    }
    throw new Error(`Can't create`);
  }

  update(options?: HttpOptions): Observable<this> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't update entity without key`);
      let resource = this._resource;
      let attrs = this.toEntity() as any;
      return Object.values(this._relations)
        .filter((value) => value.field.navigation && !value.field.collection)
        .reduce((acc, value) => {
          let ref = (this._resource as ODataEntityResource<T>).navigationProperty<any>(value.field.name).reference();
          delete attrs[value.field.name];
          return acc.pipe(switchMap(({meta}) => value.rel != null ?
            ref.set(value.rel.target() as ODataEntityResource<any>, {etag: meta.etag}) :
            ref.unset({etag: meta.etag})));
        }, of({meta: this._meta as ODataEntityMeta}))
        .pipe(
          switchMap(({meta}) => resource.put(attrs, Object.assign({ etag: meta.etag }, options || {}))),
          map(({entity, meta}) => this.populate(entity || attrs, meta)));
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
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't destroy entity without key`);
      return this._resource.delete(Object.assign({ etag: this._meta !== null ? this._meta.etag : undefined }, options || {}));
    }
    throw new Error(`Can't destroy`);
  }

  get _config() {
    if (!this._resource)
      throw new Error(`Can't config without ODataResource`);
    let schema = (this._resource as ODataEntityResource<T>).schema;
    if (schema === null)
      throw new Error(`Can't config without schema`);
    return schema;
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

  // Function
  protected _cast<S extends T>(type: string) {
    if (!this._resource)
      throw new Error(`Can't cast without ODataResource`);
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't cast without key`);
    }
    return (this._resource as ODataEntityResource<T>).cast<S>(type);
  }

  // Function
  protected _function<P, R>(path: string) {
    if (!this._resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't navigationProperty without key`);
    }
    return (this._resource as ODataEntityResource<T>).function<P, R>(path);
  }

  // Action
  protected _action<P, R>(path: string) {
    if (!this._resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't navigationProperty without key`);
    }
    return (this._resource as ODataEntityResource<T>).action<P, R>(path);
  }

  // Navigation
  protected _navigationProperty<P>(path: string) {
    if (!this._resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    if (this._resource instanceof ODataEntityResource) {
      this._resource.segment.key(this);
      if (this._resource.segment.key().empty())
        throw new Error(`Can't navigationProperty without key`);
    }
    return (this._resource as ODataEntityResource<T>).navigationProperty<P>(path);
  }

  protected getNavigationProperty<P>(field: ODataFieldParser<any>): ODataModel<P> | ODataCollection<P, ODataModel<P>> | null {
    if (!(field.name in this._relations)) {
      let value = (this._entity as any)[field.name];
      let nav = this._navigationProperty<P>(field.name);
      if (this._meta === null)
        throw new Error("No Meta")
      let rel = field.collection ?
          nav.asCollection(value, new ODataEntitiesMeta(this._meta.property(field.name) || {}, {options: this._meta.options})) :
          nav.asModel(value, new ODataEntityMeta(value || {}, {options: this._meta.options}));
      this._relations[field.name] = {field, rel};
    }
    return this._relations[field.name].rel;
  }

  protected setNavigationProperty<P, Pm extends ODataModel<P>>(field: ODataFieldParser<any>, model: Pm | null) {
    let target = model?.target();
    if (field.collection)
      throw new Error(`Can't set ${field.name} to collection, use add`);
    if (model instanceof ODataModel && target && target.type() !== field.type)
      throw new Error(`Can't set ${target.type()} to ${field.type}`);
    this._relations[field.name] = {rel: model, field};
  }
}
