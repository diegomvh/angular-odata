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
import { EventEmitter, Type } from '@angular/core';
import { ODataStructuredType } from '../schema';
export type ODataModelResource<T> = ODataEntityResource<T> | ODataSingletonResource<T> | ODataNavigationPropertyResource<T> | ODataPropertyResource<T>;
export function ODataModelField(target: any, propertyKey: string): void {
  console.log(target, propertyKey);
}
export class ODataModel<T> {
  private _attributes: T = {} as T;
  private _changes: T = {} as T;
  private _resource?: ODataModelResource<T>;
  private _schema?: ODataStructuredType<T>;
  private _meta: ODataEntityMeta;
  private _relations: {
    [name: string]: {
      model: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null,
      field: ODataStructuredTypeFieldParser<any>,
      subscriptions: Subscription[]
    }
  } = {};
  //Events
  change$ = new EventEmitter<{ attribute: string, value: any, previous?: any }>();
  request$ = new EventEmitter<Observable<ODataEntity<T>>>();
  sync$ = new EventEmitter();
  destroy$ = new EventEmitter();
  invalid$ = new EventEmitter<{ [name: string]: string[] }>();

  constructor(data?: any, {resource, schema, meta}: {
    resource?: ODataModelResource<T>,
    schema?: ODataStructuredType<T>,
    meta?: ODataEntityMeta
  } = {}) {
    data = data || {};
    if (schema)
      this.bind(schema);
    if (resource)
      this.attach(resource);
    this._meta = meta || new ODataEntityMeta(data, { options: resource?.api.options });
    data = this._meta.attributes<T>(data);
    this.assign(Objects.merge(this.defaults(), data), {reset: true});
  }

  bind(schema: ODataStructuredType<T>) {
    if (this._schema !== schema) {

      // Bind Properties
      schema.fields({ include_navigation: true, include_parents: true })
        .forEach(field => {
          Object.defineProperty(this, field.name, {
            configurable: true,
            get() {
              return this._get(field);
            },
            set(model: any) {
              this._set(field, model);
            }
          });
        });
      this._schema = schema;
    }
  }
  attach(resource: ODataModelResource<T>) {
    if (this._resource !== undefined && this._resource.type() !== resource.type() && !resource.isSubtypeOf(this._resource))
      throw new Error(`Can't reattach ${resource.type()} to ${this._resource.type()}`);

    const schema = resource.schema;
    if (schema !== undefined)
      this.bind(schema);

    // Attach complex
    Object.values(this._relations)
      .forEach(({ field, model }) => {
        if (model !== null) model.attach(resource.property<any>(field.name));
      });

    // Has key?
    if (resource instanceof ODataEntityResource && resource.segment.entitySet().hasKey()) {
      let key = resource.segment.entitySet().key<T>();
      if (typeof key !== 'object') {
        var keyField = (this.schema()?.fields() || []).find(f => f.key);
        if (keyField !== undefined) {
          this.assign({[keyField.name]: key});
        }
      } else {
        this.assign(key);
      }
    }
    this._resource = resource;
  }
  resource() {
    return this._resource?.clone();
  }
  protected schema(): ODataStructuredType<T> | undefined {
    return this._schema;
  }
  key() {
    return this.schema()?.resolveKey(this.toEntity());
  }

  // Validation
  _errors?: { [name: string]: string[] } | null;
  protected validate(entity: T) {
    const errors = {} as { [name: string]: string[] };
    const fields = this.schema()?.fields({ include_navigation: false, include_parents: true }) || [];
    // Nullables
    fields.forEach(f => {
      let value = entity[f.name as keyof T];
      if (f.nullable === false && value == null && // Is null?
        !(f.key && this.isNew()) // Not (Is Key field and isNew) ?
      ) {
        (errors[f.name] || (errors[f.name] = [])).push(`required`);
      }
      if (f.maxLength !== undefined && typeof value === 'string' && value.length > f.maxLength) {
        (errors[f.name] || (errors[f.name] = [])).push(`maxlength`);
      }
      if (f.isComplexType() && value instanceof ODataModel && !value.isValid()) {
        Object.entries(value._errors as { [name: string]: string[] }).forEach(([key, value]) => {
          errors[`${f.name}.${key}`] = value;
        });
      }
    });
    return !Types.isEmpty(errors) ? errors : null;
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

  protected defaults() {
    return this.schema()?.defaults() || {};
  }

  protected parse(attrs: Object): T {
    return attrs as T;
  }
  toEntity({ include_navigation = false, changes_only = false }: { include_navigation?: boolean, changes_only?: boolean } = {}): T {
    let entries = Object.entries(
      Object.assign({},
        this.attributes({changes_only: changes_only}),
        Object.entries(this._relations)
          .filter(([, v]) => include_navigation || !v.field.isNavigation())
          .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v.model }), {})
      )
    );
    // Map models and collections
    entries = entries.map(([k, v]) => [k,
      (v instanceof ODataModel) ? v.toEntity({changes_only, include_navigation}) :
      (v instanceof ODataCollection) ? v.toEntities({changes_only, include_navigation}) :
      v]);
    // Filter empty
    if (changes_only)
      entries = entries.filter(([, v]) => !Types.isEmpty(v));
    // Create entity
    return entries.reduce((acc, [k, v]) =>
      Object.assign(acc, { [k]: v }), {}) as T;
  }

  attributes({ changes_only = false }: { changes_only?: boolean } = {}): T {
    return Object.assign({},
      changes_only ? {} : this._attributes,
      this._changes);
  }
  private _resetting: boolean = false;
  assign(data: any, {reset = false, parse = true}: {reset?: boolean, parse?: boolean} = {}) {
    if (parse)
      data = this.parse(data) || {};

    this._resetting = reset;
    if (this._resetting) {
      this._changes = {} as T;
    }
    const assign = (target: any, source: { [attr: string]: any }) => {
      for (let attr in source) {
        let current = target[attr];
        let value = source[attr];
        if (value !== null && Types.isObject(value) && (current instanceof ODataModel || current instanceof ODataCollection)) {
          current.assign(value, {reset, parse});
        } else if (current !== value) {
          target[attr] = value;
        }
      }
    };
    assign(this, data);
    this._resetting = false;
  }

  clone() {
    let resource: ODataModelResource<T> | undefined;
    let meta: ODataEntityMeta | undefined;
    if (this._resource)
      resource = this._resource.clone();
    if (this._meta)
      meta = this._meta.clone();
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toEntity({include_navigation: true}), {resource, meta});
  }

  private _request(obs$: Observable<ODataEntity<any>>): Observable<this> {
    this.request$.emit(obs$);
    return obs$.pipe(
      map(({ entity, meta }) => {
        this._meta = meta;
        if (meta.type !== this._resource?.type && meta.type !== undefined) {
          const resource = this.resource() as ODataEntityResource<T>;
          resource.segment.entitySet().type(meta.type);
          this.attach(resource);
        }
        this.assign(this._meta.attributes<T>(entity || {}), {reset: true, parse: true});
        this.sync$.emit();
        return this;
      }));
  }

  fetch(options?: HttpOptions): Observable<this> {
    let obs$: Observable<ODataEntity<any>> = NEVER;
    if (this._resource instanceof ODataEntityResource) {
      if (!this._resource.segment.entitySet().hasKey())
        throw new Error(`Can't fetch entity without key`);
      obs$ = this._resource.get(options);
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      obs$ = this._resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {}));
    } else if (this._resource instanceof ODataPropertyResource) {
      obs$ = this._resource.get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {}));
    }
    return this._request(obs$);
  }
  save(
    {patch = false, validate = true, ...options}: HttpOptions & {patch?: boolean, validate?: boolean} = {}
  ): Observable<this> {
    let obs$: Observable<ODataEntity<any>> = NEVER;
    if (this._resource instanceof ODataEntityResource) {
      if (!validate || this._validate()) {
        const attrs = this.toEntity({changes_only: patch}) as any;
        obs$ = (this.isNew() ?
          this._resource.post(attrs, options) :
          patch ?
            this._resource.patch(attrs, options) :
            this._resource.put(attrs, options)
        ).pipe(map(({ entity, meta }) => ({ entity: entity || attrs, meta })));
      } else {
        obs$ = throwError(this._errors);
      }
    }
    return this._request(obs$);
  }

  destroy(options?: HttpOptions): Observable<this> {
    let obs$: Observable<ODataEntity<any>> = NEVER;
    if (this._resource instanceof ODataEntityResource) {
      if (!this._resource.segment.entitySet().hasKey())
        throw new Error(`Can't destroy entity without key`);
      const attrs = this.toEntity() as any;
      obs$ = this._resource.delete(Object.assign({ etag: this._meta.etag }, options || {})).pipe(
        map(({ entity, meta }) => ({ entity: entity || attrs, meta })));
    }
    return this._request(obs$).pipe(tap(() => this.destroy$.emit()));
  }

  private _call<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R> | ODataActionResource<P, R>,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
    ) {
      switch(responseType) {
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
    if (this._resource instanceof ODataEntityResource) {
      const resource = this._resource.function<P, R>(name);
      return this._call(params, resource, responseType, options);
    }
    throw new Error(`Can't function without ODataEntityResource`);
  }

  protected callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    if (this._resource instanceof ODataEntityResource) {
      const resource = this._resource.action<P, R>(name);
      return this._call(params, resource, responseType, options);
    }
    throw new Error(`Can't action without ODataEntityResource`);
  }

  // As Derived
  protected asDerived<S>(type: string): ODataModel<S> {
    if (this._resource instanceof ODataEntityResource) {
      const resource = this._resource.cast<S>(type);
      return resource.asModel(this.toEntity({include_navigation: true}), this._meta);
    }
    throw new Error(`Can't derived without ODataEntityResource`);
  }

  protected getBinding<S>(
    path: string,
    responseType: 'model' | 'collection',
    options?: HttpOptions
  ): Observable<ODataModel<S> | ODataCollection<S, ODataModel<S>> | null> {
    if (this._resource instanceof ODataEntityResource) {
      const resource = this._resource.navigationProperty<S>(path);
      switch(responseType) {
        case 'model':
          return resource.fetchModel(options);
        case 'collection':
          return resource.fetchCollection(options);
      }
    }
    throw new Error(`Can't binding without ODataEntityResource`);
  }

  // Set Reference
  protected setReference<P>(
    name: string,
    model: ODataModel<P> | null,
    options?: HttpOptions): Observable<this> {
    const field = (this.schema()?.fields({include_navigation: true, include_parents: true}) || []).find(f => f.name === name);
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
    let resource: ODataReferenceResource | undefined;
    if (this._resource instanceof ODataEntityResource) {
      resource = this._resource.navigationProperty<P>(field.name)?.reference();
    }
    if (resource === undefined)
      throw new Error(`Can't reference without ODataEntityResource or ODataNavigationPropertyResource`);
    const etag = this._meta.etag;
    const opts = Object.assign({ etag }, options || {});
    const obs$ = (model instanceof ODataModel) ?
      resource.set(model.resource() as ODataEntityResource<P>, opts) :
      resource.unset(opts);
    this.request$.emit(obs$);
    return obs$.pipe(
      map(() => {
        let attrs: any = {[name]: model};
        if (field.field !== undefined) {
          attrs[field.field] = (model instanceof ODataModel) ? model.key() : model;
        }
        this.assign(attrs, {reset: true});
        this.sync$.emit();
        return this;
      }
    ));
  }

  private _modelCollectionFactory<P>(value: any, {field, fieldType, fieldName, collection, resource, meta}: {
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
        new ODataEntitiesMeta(this._meta.property(fieldName) || {}, {options: this._meta.options}) :
        new ODataEntityMeta(value || {}, {options: this._meta.options});
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
          new Collection(data, {resource, schema, meta}) :
          new Model(data, {resource, schema, meta});
    } else {
      // Build by magic
      return collection ?
          new ODataCollection(data, {resource, meta: meta as ODataEntitiesMeta}) :
          new ODataModel(data, {resource, meta: meta as ODataEntityMeta});
    }
  }

  private _get<P>(field: ODataStructuredTypeFieldParser<P>): P | ODataModel<P> | ODataCollection<P, ODataModel<P>> | null {
    const attrs = this.attributes();
    const value = attrs[field.name as keyof T] as any;
    if (value !== null) {
      if (field.isComplexType() || field.isNavigation()) {
        if (field.isNavigation() && this.isNew())
          throw new Error(`Can't get ${field.name} from unsaved model`);
        if (!(field.name in this._relations)) {
          let resource: ODataNavigationPropertyResource<P> | ODataPropertyResource<P> | undefined;
          if (this._resource instanceof ODataEntityResource || this._resource instanceof ODataNavigationPropertyResource)
            resource = field.isNavigation() ? this._resource?.navigationProperty<P>(field.name) : this._resource?.property<P>(field.name);
          const model = this._modelCollectionFactory(value, {field, resource});
          this._relations[field.name] = { field, model, subscriptions: this._subscribe<P>(field, model) };
        }
        return this._relations[field.name].model;
      }
    }
    return value;
  }

  private _set<P>(field: ODataStructuredTypeFieldParser<P>, value: P | ODataModel<P> | ODataCollection<P, ODataModel<P>> | null) {
    let current: any;
    if (field.isComplexType() || field.isNavigation()) {
      let model: ODataModel<P> | ODataCollection<P, ODataModel<P>> | null;
      if (field.isNavigation()) {
        if (this.isNew())
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
          model = this._modelCollectionFactory(value, {field, resource});
        } else if (resource !== undefined)
          model.attach(resource);
        const type = model.resource()?.type();
        if (type !== field.type)
          throw new Error(`Can't set ${type} to ${field.type}`);
      }
      this._relations[field.name] = { model, field, subscriptions: model !== null ? this._subscribe(field, model) : [] };
      this.change$.emit({ value: model, attribute: field.name, previous: current });
    } else {
      const attrs = this.attributes();
      current = attrs[field.name as keyof T] as any;
      if (!Types.isEqual(current, value)) {
        if (this._resetting)
          this._attributes[field.name as keyof T] = value as any;
        else if (Types.isEqual(value, this._attributes[field.name as keyof T]))
          delete this._changes[field.name as keyof T];
        else
          this._changes[field.name as keyof T] = value as any;
        if (field.key) {
          const key = this.key();
          const resource = this.resource();
          if (key !== undefined && resource !== undefined && !(resource instanceof ODataSingletonResource)) {
            resource.segment.entitySet().key(key);
            this.attach(resource);
          }
        }
        this.change$.emit({ value, attribute: field.name, previous: current });
      }
    }
  }

  private _subscribe<E>(field: ODataStructuredTypeFieldParser<E>, value: ODataModel<E> | ODataCollection<E, ODataModel<E>>) {
    const subs = [];
    if (value instanceof ODataModel) {
      //Changes
      subs.push(value.change$.subscribe((event: any) => this.change$.emit({
        value: event.value,
        previous: event.previous,
        attribute: `${field.name}.${event.attribute}`
      })
      ));
    }
    return subs;
  }
}
