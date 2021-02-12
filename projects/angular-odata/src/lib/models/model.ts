import { NEVER, Observable, of, Subscription, throwError } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import {
  ODataEntityResource,
  ODataPropertyResource,
  ODataNavigationPropertyResource,
  HttpOptions,
  HttpEntityOptions,
  ODataEntityMeta,
  ODataEntitiesMeta,
  ODataEntity,
  ODataSingletonResource,
  ODataReferenceResource,
  ODataActionResource,
  ODataFunctionResource
} from '../resources/index';

import { ODataCollection } from './collection';
import { ODataStructuredTypeFieldParser } from '../parsers/structured-type';
import { Types } from '../utils/types';
import { Objects } from '../utils';
import { EventEmitter } from '@angular/core';
import { ODataStructuredType } from '../schema';
export type ODataModelResource<T> = ODataEntityResource<T> | ODataSingletonResource<T> | ODataNavigationPropertyResource<T> | ODataPropertyResource<T>;
export function ODataModelField({ name }: { name?: string } = {}) {
  return (target: any, propertyKey: string): void => {
    const options = target.options = (target.options || new ODataModelOptions()) as ODataModelOptions<any>;
    options.register(propertyKey, { name });
    console.log(target, options, name, propertyKey);
  }
}
export class ODataModelOptions<T> {
  private _attributes: T = {} as T;
  private _changes: T = {} as T;
  private _properties: {
    [key: string]: { name?: string }
  } = {};
  private _relations: {
    [name: string]: {
      model: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null,
      field: ODataStructuredTypeFieldParser<any>,
      subscriptions: Subscription[]
    }
  } = {};
  private _resource?: ODataModelResource<T>;
  private _schema?: ODataStructuredType<T>;
  private _meta: ODataEntityMeta;
  private _resetting: boolean = false;
  constructor() {
    this._meta = new ODataEntityMeta();
  }
  register(key: string, { name }: { name?: string } = {}) {
    this._properties[key] = { name };
  }
  attach(model: ODataModel<T>, resource: ODataModelResource<T>) {
    if (this._resource !== undefined && this._resource.type() !== resource.type() && !resource.isSubtypeOf(this._resource))
      throw new Error(`Can't reattach ${resource.type()} to ${this._resource.type()}`);

    const schema = resource.schema;
    if (schema !== undefined)
      this.bind(model, schema);

    // Attach complex
    Object.values(this._relations)
      .forEach(({ field, model }) => {
        if (model !== null) model.resource(field.isNavigation() ? resource.navigationProperty<any>(field.name) : resource.property<any>(field.name));
      });

    // Has key?
    if (resource instanceof ODataEntityResource && resource.segment.entitySet().hasKey()) {
      let key = resource.segment.entitySet().key<T>();
      if (typeof key !== 'object') {
        var keyField = (this.schema()?.fields() || []).find(f => f.key);
        if (keyField !== undefined) {
          model.assign({ [keyField.name]: key });
        }
      } else {
        model.assign(key);
      }
    }
    this._resource = resource;
  }
  resource() {
    return this._resource?.clone();
  }
  bind(model: ODataModel<T>, schema: ODataStructuredType<T>) {
    if (this._schema !== schema) {
      // Bind Properties
      var self = this;
      schema.fields({ include_navigation: true, include_parents: true })
        .forEach(field => {
          Object.defineProperty(model, field.name, {
            configurable: true,
            get: () => this._get(model, field),
            set: (value: any) => this._set(model, field, value)
          });
        });
      this._schema = schema;
    }
  }
  schema(): ODataStructuredType<T> | undefined {
    return this._schema;
  }
  annotate(model: ODataModel<T>, meta: ODataEntityMeta) {
    this._meta = meta;
  }
  meta() {
    return this._meta?.clone();
  }
  key(entity: T) {
    return this.schema()?.resolveKey(entity);
  }
  validate(entity: T, { create = false }: { create?: boolean } = {}) {
    return this.schema()?.validate(entity, { create });
  }
  defaults() {
    return this.schema()?.defaults() || {};
  }
  toEntity(model: ODataModel<T>, { include_navigation = false, changes_only = false }: { include_navigation?: boolean, changes_only?: boolean } = {}): T {
    let entries = Object.entries(
      Object.assign({},
        this.attributes(model, { changes_only: changes_only }),
        Object.entries(this._relations)
          .filter(([, v]) => include_navigation || !v.field.isNavigation())
          .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v.model }), {})
      )
    );
    // Map models and collections
    entries = entries.map(([k, v]) => [k,
      (v instanceof ODataModel) ? v.toEntity({ changes_only, include_navigation }) :
        (v instanceof ODataCollection) ? v.toEntities({ changes_only, include_navigation }) :
          v]);
    // Filter empty
    if (changes_only)
      entries = entries.filter(([, v]) => !Types.isEmpty(v));
    // Create entity
    return entries.reduce((acc, [k, v]) =>
      Object.assign(acc, { [k]: v }), {}) as T;
  }
  attributes(model: ODataModel<T>, { changes_only = false }: { changes_only?: boolean } = {}): T {
    return Object.assign({},
      changes_only ? {} : this._attributes,
      this._changes);
  }
  assign(model: ODataModel<T>, data: any, { reset = false, parse = true }: { reset?: boolean, parse?: boolean } = {}) {
    if (parse)
      data = model.parse(data) || {};

    this._resetting = reset;
    if (this._resetting) {
      this._changes = {} as T;
    }
    const assign = (target: any, source: { [attr: string]: any }) => {
      for (let attr in source) {
        let current = target[attr];
        let value = source[attr];
        if (value !== null && Types.isObject(value) && (current instanceof ODataModel || current instanceof ODataCollection)) {
          current.assign(value, { reset, parse });
        } else if (current !== value) {
          target[attr] = value;
        }
      }
    };
    assign(model, data);
    this._resetting = false;
  }
  private _modelCollectionFactory<P>(self: ODataModel<T>, value: any, { field, fieldType, fieldName, collection, resource, meta }: {
    field?: ODataStructuredTypeFieldParser<P>,
    fieldType?: string,
    fieldName?: string,
    collection?: boolean,
    resource?: ODataPropertyResource<P> | ODataNavigationPropertyResource<P>,
    meta?: ODataEntityMeta | ODataEntitiesMeta
  } = {}): ODataModel<P> | ODataCollection<P, ODataModel<P>> {

    if (field !== undefined) {
      collection = field?.collection;
      fieldType = field?.type;
      fieldName = field?.name;
    }

    // Data
    const data = collection ?
      (value || []) as T[] :
      (value || {}) as T;

    // Meta
    if (meta === undefined) {
      if (fieldName === undefined)
        throw new Error("Need Name");
      meta = collection ?
        new ODataEntitiesMeta(this._meta.property(fieldName) || {}, { options: this._meta.options }) :
        new ODataEntityMeta(value || {}, { options: this._meta.options });
    }

    if (resource !== undefined) {
      // Build by Resource
      return collection ?
        resource.asCollection(data as T[], meta as ODataEntitiesMeta) :
        resource.asModel(data as T, meta as ODataEntityMeta);
    } else if (fieldType !== undefined) {
      // Build by Schema
      const schema = this._schema?.api.findStructuredTypeForType(fieldType);
      const Model = schema?.model || ODataModel;
      const Collection = schema?.collection || ODataCollection;
      return collection ?
        new Collection(data, { resource, schema, meta }) :
        new Model(data, { resource, schema, meta });
    } else {
      // Build by magic
      return collection ?
        new ODataCollection(data, { resource, meta: meta as ODataEntitiesMeta }) :
        new ODataModel(data, { resource, meta: meta as ODataEntityMeta });
    }
  }
  private _get<P>(self: ODataModel<T>, field: ODataStructuredTypeFieldParser<P>): P | ODataModel<P> | ODataCollection<P, ODataModel<P>> | null {
    const attrs = this.attributes(self);
    const value = attrs[field.name as keyof T] as any;
    if (value !== null) {
      if (field.isComplexType() || field.isNavigation()) {
        if (field.isNavigation() && self.isNew())
          throw new Error(`Can't get ${field.name} from unsaved model`);
        if (!(field.name in this._relations)) {
          let resource: ODataNavigationPropertyResource<P> | ODataPropertyResource<P> | undefined;
          if (this._resource instanceof ODataEntityResource || this._resource instanceof ODataNavigationPropertyResource)
            resource = field.isNavigation() ? this._resource?.navigationProperty<P>(field.name) : this._resource?.property<P>(field.name);
          const model = this._modelCollectionFactory<any>(self, value, { field, resource });
          this._relations[field.name] = { field, model, subscriptions: this._subscribe<P>(self, field, model) };
        }
        return this._relations[field.name].model;
      }
    }
    return value;
  }

  private _set<P>(self: ODataModel<T>, field: ODataStructuredTypeFieldParser<P>, value: P | ODataModel<P> | ODataCollection<P, ODataModel<P>> | null) {
    let current: any;
    if (field.isComplexType() || field.isNavigation()) {
      let model: ODataModel<P> | ODataCollection<P, ODataModel<P>> | null;
      if (field.isNavigation()) {
        if (self.isNew())
          throw new Error(`Can't set ${field.name} from unsaved model`);
        if (field.collection)
          throw new Error(`Can't set ${field.name} to navigation collection, use add instead`);
        model = value as ODataModel<P> | null;
        if (model?.isNew())
          throw new Error(`Can't set ${field.name}`);
      } else {
        model = value as ODataModel<P> | ODataCollection<P, ODataModel<P>> | null;
      }
      const relation = this._relations[field.name];
      if (relation !== undefined) {
        relation.subscriptions.forEach(sub => sub.unsubscribe());
      }
      current = relation?.model as ODataModel<any> | ODataCollection<any, ODataModel<any>> | null;
      if (model !== null) {
        let resource: ODataNavigationPropertyResource<P> | ODataPropertyResource<P> | undefined;
        if (this._resource instanceof ODataEntityResource || this._resource instanceof ODataNavigationPropertyResource)
          resource = field.isNavigation() ? this._resource?.navigationProperty<P>(field.name) : this._resource?.property<P>(field.name);
        if (!(model instanceof ODataModel) && !(model instanceof ODataCollection)) {
          model = this._modelCollectionFactory(self, value, { field, resource });
        } else if (resource !== undefined)
          model.resource(resource);
        const type = model.resource()?.type();
        if (type !== field.type)
          throw new Error(`Can't set ${type} to ${field.type}`);
      }
      this._relations[field.name] = { model, field, subscriptions: model !== null ? this._subscribe(self, field, model) : [] };
      self.change$.emit({ value: model, attribute: field.name, previous: current });
    } else {
      const attrs = this.attributes(self);
      current = attrs[field.name as keyof T] as any;
      if (!Types.isEqual(current, value)) {
        if (this._resetting)
          this._attributes[field.name as keyof T] = value as any;
        else if (Types.isEqual(value, this._attributes[field.name as keyof T]))
          delete this._changes[field.name as keyof T];
        else
          this._changes[field.name as keyof T] = value as any;
        if (field.key) {
          const key = self.key();
          const resource = self.resource();
          if (key !== undefined && resource !== undefined && !(resource instanceof ODataSingletonResource)) {
            resource.segment.entitySet().key(key);
            this.attach(self, resource);
          }
        }
        self.change$.emit({ value, attribute: field.name, previous: current });
      }
    }
  }
  private _subscribe<E>(self: ODataModel<T>, field: ODataStructuredTypeFieldParser<E>, value: ODataModel<E> | ODataCollection<E, ODataModel<E>>) {
    const subs = [];
    if (value instanceof ODataModel) {
      //Changes
      subs.push(value.change$.subscribe((event: any) => self.change$.emit({
        value: event.value,
        previous: event.previous,
        attribute: `${field.name}.${event.attribute}`
      })
      ));
    }
    return subs;
  }
}

export class ODataModel<T> {
  //Events
  options!: ODataModelOptions<T>;
  change$ = new EventEmitter<{ attribute: string, value: any, previous?: any }>();
  request$ = new EventEmitter<Observable<ODataEntity<T>>>();
  sync$ = new EventEmitter();
  destroy$ = new EventEmitter();
  invalid$ = new EventEmitter<{ [name: string]: string[] }>();
  constructor(data?: any, { resource, schema, meta }: {
    resource?: ODataModelResource<T>,
    schema?: ODataStructuredType<T>,
    meta?: ODataEntityMeta
  } = {}) {
    this.options = this.options || new ODataModelOptions<T>();
    data = data || {};
    this.resource(resource);
    this.schema(schema);
    this.meta(meta);
    this.assign(Objects.merge(this.defaults(), data), { reset: true });
  }
  resource(resource?: ODataModelResource<T>) {
    if (resource !== undefined)
      this.options.attach(this, resource);
    return this.options.resource();
  }
  schema(schema?: ODataStructuredType<T>) {
    if (schema !== undefined)
      this.options.bind(this, schema);
    return this.options.schema();
  }
  meta(meta?: ODataEntityMeta) {
    if (meta !== undefined)
      this.options.annotate(this, meta);
    return this.options.meta();
  }
  key() {
    return this.options.key(this.toEntity());
  }

  // Validation
  _errors?: { [name: string]: string[] } | null;
  protected validate(entity: T) {
    return this.options.validate(entity);
  }
  private _validate() {
    let error = this._errors = this.validate(this.toEntity());
    if (error)
      this.invalid$.emit(error);
    return this._errors === null;
  }
  isValid(): boolean {
    return this._validate();
  }
  isNew() {
    return this.key() === undefined;
  }
  defaults() {
    return this.options.defaults();
  }
  parse(attrs: Object): T {
    return attrs as T;
  }
  toEntity({ include_navigation = false, changes_only = false }: { include_navigation?: boolean, changes_only?: boolean } = {}): T {
    return this.options.toEntity(this, {include_navigation, changes_only});
  }
  attributes({ changes_only = false }: { changes_only?: boolean } = {}): T {
    return this.options.attributes(this, {changes_only});
  }
  assign(data: any, { reset = false, parse = true }: { reset?: boolean, parse?: boolean } = {}) {
    this.options.assign(this, data, {reset, parse});
  }
  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toEntity({ include_navigation: true }), { resource: this.options.resource(), meta: this.options.meta() });
  }
  private _request(resource: ODataModelResource<T>, obs$: Observable<ODataEntity<any>>): Observable<this> {
    this.request$.emit(obs$);
    return obs$.pipe(
      map(({ entity, meta }) => {
        if (meta.type !== undefined && meta.type !== resource.type()) {
          const schema = resource.api.findStructuredTypeForType<any>(meta.type);
          if (schema !== undefined) this.schema(schema);
        }
        this.assign(meta.attributes<T>(entity || {}), { reset: true, parse: true });
        this.sync$.emit();
        return this;
      }));
  }
  fetch(options?: HttpOptions): Observable<this> {
    const resource = this.resource();
    if (resource !== undefined) {
      let obs$: Observable<ODataEntity<any>> = NEVER;
      if (resource instanceof ODataEntityResource) {
        if (!resource.segment.entitySet().hasKey())
          throw new Error(`Can't fetch entity without key`);
        obs$ = resource.get(options);
      } else if (resource instanceof ODataNavigationPropertyResource) {
        obs$ = resource.get(
          Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {}));
      } else if (resource instanceof ODataPropertyResource) {
        obs$ = resource.get(
          Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {}));
      }
      return this._request(resource, obs$);
    }
    return throwError("Resource Error");
  }

  save(
    { patch = false, validate = true, ...options }: HttpOptions & { patch?: boolean, validate?: boolean } = {}
  ): Observable<this> {
    const resource = this.resource();
    if (resource !== undefined) {
      let obs$: Observable<ODataEntity<any>> = NEVER;
      if (resource instanceof ODataEntityResource) {
        if (!validate || this._validate()) {
          const attrs = this.toEntity({ changes_only: patch }) as any;
          obs$ = (this.isNew() ?
            resource.post(attrs, options) :
            patch ?
              resource.patch(attrs, options) :
              resource.put(attrs, options)
          ).pipe(map(({ entity, meta }) => ({ entity: entity || attrs, meta })));
        } else {
          obs$ = throwError(this._errors);
        }
      }
      return this._request(resource, obs$);
    }
    return throwError("Resource Error");
  }

  destroy(options?: HttpOptions): Observable<this> {
    const resource = this.resource();
    if (resource !== undefined) {
      let obs$: Observable<ODataEntity<any>> = NEVER;
      if (resource instanceof ODataEntityResource) {
        if (!resource.segment.entitySet().hasKey())
          throw new Error(`Can't destroy entity without key`);
        const attrs = this.toEntity() as any;
        obs$ = resource.delete(Object.assign({ etag: this.meta().etag }, options || {})).pipe(
          map(({ entity, meta }) => ({ entity: entity || attrs, meta })));
      }
      return this._request(resource, obs$).pipe(tap(() => this.destroy$.emit()));
    }
    return throwError("Resource Error");
  }

  private _call<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R> | ODataActionResource<P, R>,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ) {
    switch (responseType) {
      case 'property':
        return resource.callProperty(params, options);
      case 'model':
        return resource.callModel(params, options);
      case 'collection':
        return resource.callCollection(params, options);
      default:
        return resource.call(params, options);
    }
  }

  protected callFunction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
    if (resource instanceof ODataEntityResource) {
      return this._call(params, resource.function<P, R>(name), responseType, options);
    }
    throw new Error(`Can't function without ODataEntityResource`);
  }

  protected callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
    if (resource instanceof ODataEntityResource) {
      return this._call(params, resource.action<P, R>(name), responseType, options);
    }
    throw new Error(`Can't action without ODataEntityResource`);
  }

  // As Derived
  protected asDerived<S>(type: string): ODataModel<S> {
    const resource = this.resource();
    if (resource instanceof ODataEntityResource) {
      return resource.cast<S>(type).asModel(this.toEntity({ include_navigation: true }), this.meta());
    }
    throw new Error(`Can't derived without ODataEntityResource`);
  }

  protected getBinding<S>(
    path: string,
    responseType: 'model' | 'collection',
    options?: HttpOptions
  ): Observable<ODataModel<S> | ODataCollection<S, ODataModel<S>> | null> {
    const resource = this.resource();
    if (resource instanceof ODataEntityResource) {
      const nav = resource.navigationProperty<S>(path);
      switch (responseType) {
        case 'model':
          return nav.fetchModel(options);
        case 'collection':
          return nav.fetchCollection(options);
      }
    }
    throw new Error(`Can't binding without ODataEntityResource`);
  }

  // Set Reference
  protected setReference<P>(
    name: string,
    model: ODataModel<P> | null,
    options?: HttpOptions
  ): Observable<this> {
    const field = (this.schema()?.fields({ include_navigation: true, include_parents: true }) || []).find(f => f.name === name);
    if (field === undefined)
      throw new Error(`Can't find field ${name}`);
    if (field.collection)
      throw new Error(`Can't set ${field.name} to collection, use add`);
    // TODO: check and
    /*
    obs$ = Object.values(this.__navigation)
      .reduce((acc, value) => {
        let ref = (this.__resource as ODataEntityResource<T>).navigationProperty<any>(value.field.name).reference();
        delete attrs[value.field.name];
        return acc.pipe(switchMap(({meta}) => value.model != null ?
          ref.set(value.model._resource() as ODataEntityResource<any>, {etag: meta.etag}) :
          ref.unset({etag: meta.etag})));
      }, of({meta: this.__meta as ODataEntityMeta}))
      .pipe(
        switchMap(({meta}) => resource.put(attrs, Object.assign({ etag: meta.etag }, options || {}))),
        map(({entity, meta}) => ({entity: entity || attrs, meta})));
      */
    const resource = this.resource();
    let ref: ODataReferenceResource | undefined;
    if (resource instanceof ODataEntityResource) {
      ref = resource.navigationProperty<P>(field.name)?.reference();
    }
    if (ref === undefined)
      throw new Error(`Can't reference without ODataEntityResource or ODataNavigationPropertyResource`);
    const etag = this.meta().etag;
    const opts = Object.assign({ etag }, options || {});
    const obs$ = (model instanceof ODataModel) ?
      ref.set(model.resource() as ODataEntityResource<P>, opts) :
      ref.unset(opts);
    this.request$.emit(obs$);
    return obs$.pipe(
      map(() => {
        let attrs: any = { [name]: model };
        if (field.field !== undefined) {
          attrs[field.field] = (model instanceof ODataModel) ? model.key() : model;
        }
        this.assign(attrs, { reset: true });
        this.sync$.emit();
        return this;
      }
      ));
  }


}
