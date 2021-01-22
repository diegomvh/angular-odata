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
import { ODataStructuredTypeFieldParser } from '../parsers/structured-type';
import { ɵpublishDefaultGlobalUtils } from '@angular/core';
import { Types } from '../utils/types';
import { Objects } from '../utils';

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export class ODataModel<T> {
  private __resource: ODataResource<T> | null;
  private __entity: T;
  private __meta: ODataEntityMeta | null;
  private __relations: { [name: string]: {
    rel: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null,
    field: ODataStructuredTypeFieldParser<any>
  }};

  constructor(data?: any, options: { resource?: ODataResource<T>, meta?: ODataEntityMeta } = {}) {
    this.__resource = null;
    this.__entity = {} as T;
    this.__meta = null;
    this.__relations = {};
    if (options.resource instanceof ODataResource)
      this.attach(options.resource);
    this.populate(data || {}, options.meta);
  }

  attach(resource: ODataResource<T>) {
    if (this.__resource !== null && this.__resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this.__resource.type()}`);
    let first = !this.__resource;
    this.__resource = resource;
    if (first) {
      (this._schema?.fields({include_navigation: true, include_parents: true}) || [])
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
      if (this.__entity)
        this.populate(this.__entity, this.__meta !== null ? this.__meta : undefined);
    }
    return this;
  }

  get _resource() {
    return this.__resource !== null ? this.__resource.clone() as ODataResource<T> : null;
  }

  // Validation
  _errors: any;
  protected validate() {
    let errors = {} as any;
    let fields = this._schema?.fields({include_navigation: false, include_parents: true}) || [];
    // Nullables
    fields.filter(f => (!f.nullable || f.maxLength || f.isComplexType())).forEach(f => {
      let value = (this as any)[f.name];
      if (!value) {
        (errors[f.name] || (errors[f.name] = [])).push(`required`);
      }
      else if (f.maxLength && value.length > f.maxLength) {
        (errors[f.name] || (errors[f.name] = [])).push(`maxlength`);
      }
      else if (f.isComplexType() && !value.isValid()) {
        errors[f.name] = value._errors;
      }
    });
    return !Types.isEmpty(errors) ? errors : undefined;
  }

  isValid(): boolean {
    this._errors = this.validate();
    return this._errors === undefined;
  }

  protected defaults() {
    return this._schema?.defaults() || {};
  }

  protected parse(entity: T) {
    let fields = this._schema?.fields({include_navigation: true, include_parents: true}) || [];
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
        let value = (this.__entity as any)[f.name];
        if (value) {
          let prop = (this.__resource as ODataEntityResource<T>).property<any>(f.name);
          if (this.__meta === null)
            throw("No metadata value");
          value = f.collection ?
            prop.asCollection(value, new ODataEntitiesMeta(this.__meta.property(f.name) || {}, {options: this.__meta.options})) :
            prop.asModel(value, new ODataEntityMeta(value || {}, {options: this.__meta.options}));
        }
        return Object.assign(acc, { [k]: value });
      }, {}));
    return attrs;
  }

  protected populate(data: Object, meta?: ODataEntityMeta) {
    this.__meta = meta || new ODataEntityMeta(data, {options: this.__resource ? this.__resource.api.options : undefined});
    this.__entity = this.__meta.attributes<T>(data);
    this.__relations = {};
    const attrs = this.parse(Object.assign(this.defaults(), this.__entity));
    return this.assign(attrs);
  }

  toEntity(): T {
    return Object.entries(
      Object.assign({},
        this.__entity,
        Object.entries(this)
          .filter(([key, ]) => !key.startsWith("_"))
          .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {}),
        Object.entries(this.__relations).reduce((acc, [k, v]) => Object.assign(acc, {[k]: v.rel}), {})
      )
    ).reduce((acc, [k, value]) =>
      Object.assign(acc, { [k]: (value instanceof ODataModel) ?
        value.toEntity() :
        (value instanceof ODataCollection) ?
        value.toEntities() : value }),
      {}) as T;
  }

  assign(attrs: DeepPartial<T>) {
    const current = this.toEntity();
    Objects.merge(this, attrs);
    const diffs = Objects.difference(current, this.toEntity());
    //if (!Types.isEmpty(diffs))
      //this.change$.emit(diffs);
    return this;
  }

  clone() {
    let options: {resource?: ODataResource<T>, meta?: ODataEntityMeta} = {};
    if (this.__resource)
      options.resource = this.__resource.clone();
    if (this.__meta)
      options.meta = this.__meta.clone();
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toEntity(), options);
  }

  fetch(options?: HttpOptions): Observable<this> {
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't fetch entity without key`);
      return this.__resource.get(options).pipe(
        map(({entity, meta}) => this.populate(entity, meta)));
    } else if (this.__resource instanceof ODataNavigationPropertyResource) {
      return this.__resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})).pipe(
          map(({entity, meta}) => this.populate(entity, meta)));
    } else if (this.__resource instanceof ODataPropertyResource) {
      return this.__resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})).pipe(
          map(({entity, meta}) => this.populate(entity, meta)));
    } else if (this.__resource instanceof ODataFunctionResource) {
      return this.__resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})).pipe(
          map(({entity, meta}) => this.populate(entity, meta)));
    }
    throw new Error("Not Yet!");
  }

  create(options?: HttpOptions): Observable<this> {
    if (this.__resource instanceof ODataEntityResource) {
      let attrs = this.toEntity();
      return this.__resource.post(attrs, options).pipe(
        map(({entity, meta}) => this.populate(entity || attrs, meta)));
    }
    throw new Error(`Can't create`);
  }

  update(options?: HttpOptions): Observable<this> {
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't update entity without key`);
      let resource = this.__resource;
      let attrs = this.toEntity() as any;
      return Object.values(this.__relations)
        .filter((value) => value.field.navigation && !value.field.collection)
        .reduce((acc, value) => {
          let ref = (this.__resource as ODataEntityResource<T>).navigationProperty<any>(value.field.name).reference();
          delete attrs[value.field.name];
          return acc.pipe(switchMap(({meta}) => value.rel != null ?
            ref.set(value.rel._resource as ODataEntityResource<any>, {etag: meta.etag}) :
            ref.unset({etag: meta.etag})));
        }, of({meta: this.__meta as ODataEntityMeta}))
        .pipe(
          switchMap(({meta}) => resource.put(attrs, Object.assign({ etag: meta.etag }, options || {}))),
          map(({entity, meta}) => this.populate(entity || attrs, meta)));
    }
    throw new Error(`Can't update`);
  }

  save(options?: HttpOptions): Observable<this> {
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      return this.__resource.segment.key().empty() ? this.create(options) : this.update(options);
    }
    throw new Error(`Can't save`);
  }

  destroy(options?: HttpOptions): Observable<null> {
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't destroy entity without key`);
      return this.__resource.delete(Object.assign({ etag: this.__meta !== null ? this.__meta.etag : undefined }, options || {}));
    }
    throw new Error(`Can't destroy`);
  }

  protected get _schema() {
    if (!this.__resource)
      throw new Error(`Can't schema without ODataResource`);
    return (this.__resource as ODataEntityResource<T>).schema;
  }

  protected get _segment() {
    if (!this.__resource)
      throw new Error(`Can't call without ODataResource`);
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't use without key`);
    }
    return (this.__resource as ODataEntityResource<T>).segment;
  }

  protected get _query() {
    if (!this.__resource)
      throw new Error(`Can't query without ODataResource`);
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't query without key`);
    }
    return (this.__resource as ODataEntityResource<T>).query;
  }

  // Function
  protected _cast<S extends T>(type: string) {
    if (!this.__resource)
      throw new Error(`Can't cast without ODataResource`);
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't cast without key`);
    }
    return (this.__resource as ODataEntityResource<T>).cast<S>(type);
  }

  // Function
  protected _function<P, R>(path: string) {
    if (!this.__resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't navigationProperty without key`);
    }
    return (this.__resource as ODataEntityResource<T>).function<P, R>(path);
  }

  // Action
  protected _action<P, R>(path: string) {
    if (!this.__resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't navigationProperty without key`);
    }
    return (this.__resource as ODataEntityResource<T>).action<P, R>(path);
  }

  // Navigation
  protected _navigationProperty<P>(path: string) {
    if (!this.__resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't navigationProperty without key`);
    }
    return (this.__resource as ODataEntityResource<T>).navigationProperty<P>(path);
  }

  protected getNavigationProperty<P>(field: ODataStructuredTypeFieldParser<any>): ODataModel<P> | ODataCollection<P, ODataModel<P>> | null {
    if (!(field.name in this.__relations)) {
      let value = (this.__entity as any)[field.name];
      let nav = this._navigationProperty<P>(field.name);
      if (this.__meta === null)
        throw new Error("No Meta")
      let rel = field.collection ?
          nav.asCollection(value, new ODataEntitiesMeta(this.__meta.property(field.name) || {}, {options: this.__meta.options})) :
          nav.asModel(value, new ODataEntityMeta(value || {}, {options: this.__meta.options}));
      this.__relations[field.name] = {field, rel};
    }
    return this.__relations[field.name].rel;
  }

  protected setNavigationProperty<P, Pm extends ODataModel<P>>(field: ODataStructuredTypeFieldParser<any>, model: Pm | null) {
    let target = model?._resource;
    if (field.collection)
      throw new Error(`Can't set ${field.name} to collection, use add`);
    if (model instanceof ODataModel && target && target.type() !== field.type)
      throw new Error(`Can't set ${target.type()} to ${field.type}`);
    this.__relations[field.name] = {rel: model, field};
  }
}
