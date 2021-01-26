import { NEVER, Observable, of, Subscription } from 'rxjs';
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
  ODataEntitiesMeta,
  ODataEntity
} from '../resources/index';

import { ODataCollection } from './collection';
import { ODataStructuredTypeFieldParser } from '../parsers/structured-type';
import { Types } from '../utils/types';
import { Objects } from '../utils';
import { EventEmitter } from '@angular/core';

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export class ODataModel<T> {
  private __entity: T;
  private __resource: ODataResource<T> | null = null;
  private __meta: ODataEntityMeta;
  private __relations: { [name: string]: {
    model: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null,
    field: ODataStructuredTypeFieldParser<any>,
    subs: Subscription[]
  }} = {};
  //Events
  change$ = new EventEmitter<{attribute: string, value: any, previous?: any}>();
  request$ = new EventEmitter<Observable<ODataEntity<T>>>();
  sync$ = new EventEmitter();
  destroy$ = new EventEmitter();
  invalid$ = new EventEmitter();

  constructor(data?: any, options: { resource?: ODataResource<T>, meta?: ODataEntityMeta } = {}) {
    if (options.resource instanceof ODataResource)
      this.attach(options.resource);
    this.__meta = options.meta || new ODataEntityMeta(data, {options: options.resource?.api.options});
    this.__entity = this.parse(
      Objects.merge(this.defaults(), this.__meta.attributes<T>(data))
    ) as T;
  }

  attach(resource: ODataResource<T>) {
    if (this.__resource !== null && this.__resource.type() !== resource.type() && !resource.isSubtypeOf(this.__resource))
      throw new Error(`Can't reattach ${resource.type()} to ${this.__resource.type()}`);
    this.__resource = resource;
    (this._schema?.fields({include_navigation: true, include_parents: true}) || [])
      .forEach(field => {
        Object.defineProperty(this, field.name, {
          configurable: true,
          get() {
            return this.__get(field);
          },
          set(model: ODataModel<any> | null) {
            this.__set(field, model);
          }
        });
      });
    return this;
  }

  get _resource() {
    return this.__resource !== null ? this.__resource.clone() as ODataResource<T> : null;
  }

  isNew() {
    return !(this.__resource instanceof ODataEntityResource) || Types.isEmpty(this.__resource.segment.key(this));
  }

  // Validation
  _errors?: {[name: string]: string[]} | null;
  protected validate() {
    const errors = {} as {[name: string]: string[]};
    const fields = this._schema?.fields({include_navigation: false, include_parents: true}) || [];
    // Nullables
    fields.forEach(f => {
      let value = (this as any)[f.name] as any;
      if (f.nullable === false && value == null) {
        (errors[f.name] || (errors[f.name] = [])).push(`required`);
      }
      if (f.maxLength !== undefined && value && 'length' in value && value.length > f.maxLength) {
        (errors[f.name] || (errors[f.name] = [])).push(`maxlength`);
      }
      if (f.isComplexType() && value instanceof ODataModel && !value.isValid()) {
        Object.entries(value._errors as {[name: string]: string[]}).forEach(([key, value]) => {
          errors[`${f.name}.${key}`] = value;
        });
      }
    });
    return !Types.isEmpty(errors) ? errors : null;
  }

  isValid(): boolean {
    let error = this._errors = this.validate();
    if (error)
      this.invalid$.emit(error);
    return this._errors === null;
  }

  protected defaults() {
    return this._schema?.defaults() || {};
  }

  protected parse(attrs: Object): T {
    return attrs as T;
  }

  toEntity(): T {
    return Object.entries(
      Object.assign({},
        this.__entity,
        Object.entries(this.__relations).reduce((acc, [k, v]) => Object.assign(acc, {[k]: v.model}), {})
      )
    ).reduce((acc, [k, value]) =>
      Object.assign(acc, { [k]: (value instanceof ODataModel) ?
        value.toEntity() :
        (value instanceof ODataCollection) ?
        value.toEntities() : value }),
      {}) as T;
  }

  assign(attrs: DeepPartial<T>) {
    const assign = (target: any, source: {[attr: string]: any}) => {
      for (let attr in source) {
        let value = source[attr];
        if (value !== null && Types.isObject(value) && attr in target && target[attr] instanceof ODataModel) {
          target[attr].assign(value);
        } else if (target[attr] !== value) {
          target[attr] = value;
        }
      }
    };
    assign(this, attrs);
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

  private __request(obs$: Observable<ODataEntity<any>>): Observable<this> {
    this.request$.emit(obs$);
    return obs$.pipe(
      map(({entity, meta}) => {
        this.__meta = meta;
        if (meta.type !== this.__resource?.type && meta.type !== undefined) {
          const resource = this._resource as ODataEntityResource<T>;
          resource.segment.entitySet().setType(meta.type);
          this.attach(resource);
        }
        this.assign(this.parse(this.__meta.attributes<T>(entity || {})));
        this.sync$.emit();
        return this;
      }));
  }

  fetch(options?: HttpOptions): Observable<this> {
    let obs$: Observable<ODataEntity<any>> = NEVER;
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't fetch entity without key`);
      obs$ = this.__resource.get(options);
    } else if (this.__resource instanceof ODataNavigationPropertyResource) {
      obs$ = this.__resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {}));
    } else if (this.__resource instanceof ODataPropertyResource) {
      obs$ =  this.__resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {}));
    } else if (this.__resource instanceof ODataFunctionResource) {
      obs$ = this.__resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {}));
    }
    return this.__request(obs$);
  }

  create(options?: HttpOptions): Observable<this> {
    let obs$: Observable<ODataEntity<any>> = NEVER;
    if (this.__resource instanceof ODataEntityResource) {
      let attrs = this.toEntity();
      obs$ = this.__resource.post(attrs, options).pipe(
        map(({entity, meta}) => ({entity: entity || attrs, meta})));
    }
    return this.__request(obs$);
  }

  update(options?: HttpOptions): Observable<this> {
    let obs$: Observable<ODataEntity<any>> = NEVER;
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't update entity without key`);
      let resource = this.__resource;
      let attrs = this.toEntity() as any;
      obs$ = Object.values(this.__relations)
        .filter((value) => value.field.navigation && !value.field.collection)
        .reduce((acc, value) => {
          let ref = (this.__resource as ODataEntityResource<T>).navigationProperty<any>(value.field.name).reference();
          delete attrs[value.field.name];
          return acc.pipe(switchMap(({meta}) => value.model != null ?
            ref.set(value.model._resource as ODataEntityResource<any>, {etag: meta.etag}) :
            ref.unset({etag: meta.etag})));
        }, of({meta: this.__meta as ODataEntityMeta}))
        .pipe(
          switchMap(({meta}) => resource.put(attrs, Object.assign({ etag: meta.etag }, options || {}))),
          map(({entity, meta}) => ({entity: entity || attrs, meta})));
    }
    return this.__request(obs$);
  }

  save(options?: HttpOptions): Observable<this> {
    return this.isNew() ? this.create(options) : this.update(options);
  }

  destroy(options?: HttpOptions): Observable<this> {
    let obs$: Observable<ODataEntity<any>> = NEVER;
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't destroy entity without key`);
      let attrs = this.toEntity() as any;
      obs$ = this.__resource.delete(Object.assign({ etag: this.__meta.etag }, options || {})).pipe(
        map(({entity, meta}) => ({entity: entity || attrs, meta})));
    }
    return this.__request(obs$).pipe(self => {
      this.destroy$.emit();
      return self;
    });
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

  protected _property<P>(path: string) {
    if (!this.__resource)
      throw new Error(`Can't property without ODataResource`);
    if (this.__resource instanceof ODataEntityResource) {
      this.__resource.segment.key(this);
      if (this.__resource.segment.key().empty())
        throw new Error(`Can't property without key`);
    }
    return (this.__resource as ODataEntityResource<T>).property<P>(path);
  }

  private __get<P>(field: ODataStructuredTypeFieldParser<P>): P | ODataModel<P> | ODataCollection<P, ODataModel<P>> | null {
    const value = this.__entity[field.name as keyof T] as any;
    if (value !== null && (field.isNavigation() || field.isComplexType())) {
      if (!(field.name in this.__relations)) {
        const prop = field.isNavigation() ? this._navigationProperty<P>(field.name) : this._property<P>(field.name);
        const model = field.collection ?
            prop.asCollection((value || []) as T[], new ODataEntitiesMeta(this.__meta.property(field.name) || {}, {options: this.__meta.options})) :
            prop.asModel((value || {}) as T, new ODataEntityMeta(value || {}, {options: this.__meta.options}));
        this.__relations[field.name] = {field, model, subs: this.__subscribe<P>(field, model)};
      }
      return this.__relations[field.name].model;
    } else {
      return value;
    }
  }

  private __set<P>(field: ODataStructuredTypeFieldParser<P>, value: P | ODataModel<P> | ODataCollection<P, ODataModel<P>> | null) {
    let current: any;
    if (field.isNavigation() || field.isComplexType()) {
      const model = value as ODataModel<any> | ODataCollection<any, ODataModel<any>> | null;
      const type = model?._resource?.type() || typeof value;
      if (field.collection)
        throw new Error(`Can't set collection of type ${type} as ${field.name}, use add instead`);
      if (type !== field.type)
        throw new Error(`Can't set ${type} to ${field.type}`);
      const relation = this.__relations[field.name];
      if (relation !== undefined) {
        relation.subs.forEach(sub => sub.unsubscribe());
      }
      current = relation?.model as ODataModel<any> | ODataCollection<any, ODataModel<any>> | null;
      this.__relations[field.name] = {model, field, subs: model !== null ? this.__subscribe(field, model) : []};
    } else {
      current = this.__entity[field.name as keyof T] as any;
      this.__entity[field.name as keyof T] = value as any;
    }
    if (current !== value)
      this.change$.emit({value, attribute: field.name, previous: current});
  }

  private __subscribe<E>(field: ODataStructuredTypeFieldParser<E>, value: ODataModel<E> | ODataCollection<E, ODataModel<E>>) {
    const subs = [];
    if (value instanceof ODataModel) {
      //Changes
      subs.push(value.change$.subscribe((event: any) => this.change$.emit({
        value: event.value,
        previous: event.previous,
        attribute: `${field.name}.${event.attribute}`})
      ));
    }
    return subs;
  }
}
