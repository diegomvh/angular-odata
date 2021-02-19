import { NEVER, Observable, Subscription, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';

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
    const properties = target._properties = (target._properties || []) as ModelProperty<any>[];
    properties.push({ name: propertyKey, field: name || propertyKey });
  }
}

type ModelProperty<F> = { name: string, field: string };
class ODataModelProperty<F> {
  name: string;
  field: string;
  parser?: ODataStructuredTypeFieldParser<F>;
  constructor({name, field}: {name: string, field: string}) {
    this.name = name;
    this.field = field;
  }
  resourceFactory<T, F>(resource: ODataModelResource<T>): ODataNavigationPropertyResource<F> | ODataPropertyResource<F> | undefined {
    return (
      this.parser !== undefined &&
      (resource instanceof ODataEntityResource || resource instanceof ODataNavigationPropertyResource || resource instanceof ODataPropertyResource)
    ) ?
      this.parser.isNavigation() ? resource?.navigationProperty<F>(this.parser.name) : resource?.property<F>(this.parser.name) :
      undefined;
  }

  metaFactory(meta: ODataEntityMeta): ODataEntityMeta | ODataEntitiesMeta | undefined {
    return (this.parser !== undefined) ?
      this.parser.collection ?
        new ODataEntitiesMeta(meta.property(this.parser.name) || {}, { options: meta.options }) :
        new ODataEntityMeta(meta.property(this.parser.name) || {}, { options: meta.options }) :
        undefined;
  }

  modelCollectionFactory<T, F>(
    { value, baseResource, baseMeta, reset}: {
    value?: any,
    baseResource: ODataModelResource<T>,
    baseMeta: ODataEntityMeta,
    reset?: boolean
  }): ODataModel<F> | ODataCollection<F, ODataModel<F>> {

    // Data
    const data = this.parser?.collection ?
      (value || []) as F[] :
      (value || {}) as F;

    const meta = this.metaFactory(baseMeta);
    const resource = this.resourceFactory<T, F>(baseResource) as ODataNavigationPropertyResource<F> | ODataPropertyResource<F>;

    return (
      this.parser !== undefined &&
      this.parser.collection) ?
        resource.asCollection(data as F[], { meta: meta as ODataEntitiesMeta, reset }) :
        resource.asModel(data as F, { meta: meta as ODataEntityMeta, reset });
  }
}
type ODataModelRelation = {
  model: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null,
  property: ODataModelProperty<any>,
  subscriptions: Subscription[]
};
export class ODataModelOptions<T> {
  private _attributes: T = {} as T;
  private _changes: T = {} as T;
  private _properties: ODataModelProperty<any>[] = [];
  private _relations: { [name: string]: ODataModelRelation } = {};
  private _resource?: ODataModelResource<T>;
  private _schema?: ODataStructuredType<T>;
  private _meta: ODataEntityMeta;
  private _resetting: boolean = false;

  constructor(props: ModelProperty<any>[]) {
    this._meta = new ODataEntityMeta();
    this._properties = props.map(prop => new ODataModelProperty(prop));
  }

  attach(model: ODataModel<T>, resource: ODataModelResource<T>) {
    if (this._resource !== undefined && resource.type() !== this._resource.type() && !resource.isSubtypeOf(this._resource))
      throw new Error(`Can't reattach ${resource.type()} to ${this._resource.type()}`);

    const schema = resource.schema;
    if (schema !== undefined)
      this.bind(model, schema);

    // Attach complex
    for (var relation of Object.values(this._relations)) {
      const { property, model } = relation;
      const field = property.parser;
      if (field === undefined) {
        throw new Error("No Field");
      }
      if (model !== null)
        model.resource(property.resourceFactory<T, any>(resource));
    }
    this._resource = resource;
  }

  resource() {
    return this._resource?.clone();
  }

  bind(model: ODataModel<T>, schema: ODataStructuredType<T>) {
    if (this._schema === undefined || schema.type() !== this._schema.type()) {
      // Bind Properties
      const fields = schema.fields({ include_navigation: true, include_parents: true });
      for (var field of fields) {
        let prop = this._properties.find(p => p.field === field.name);
        if (prop === undefined) {
          prop = new ODataModelProperty({name: field.name, field: field.name});
          this._properties.push(prop);
        }
        prop.parser = field;
        Object.defineProperty(model, prop.name, {
          configurable: true,
          get: () => this._get(model, prop as ODataModelProperty<any>),
          set: (value: any) => this._set(model, prop as ODataModelProperty<any>, value)
        });
      }
      this._schema = schema;
    }
  }

  schema(): ODataStructuredType<T> | undefined {
    return this._schema;
  }

  annotate(model: ODataModel<T>, meta: ODataEntityMeta) {
    if (meta.type !== undefined && meta.type !== this._resource?.type()) {
      const schema = this._resource?.api.findStructuredTypeForType<any>(meta.type);
      if (schema !== undefined) this.bind(model, schema);
    }
    this._meta = meta;
  }

  meta() {
    return this._meta?.clone();
  }

  get query() {
    if (this._resource === undefined)
      throw new Error(`Can't query without ODataResource`);
    return this._resource.query;
  }

  key(entity: T) {
    return this.schema()?.resolveKey(entity);
  }

  validate(entity: T, { create = false, patch = false }: { create?: boolean, patch?: boolean } = {}) {
    return this.schema()?.validate(entity, { create, patch });
  }

  defaults() {
    return this.schema()?.defaults() || {};
  }

  toEntity(model: ODataModel<T>, {
    include_navigation = false,
    changes_only = false,
    field_mapping = false
  }: { include_navigation?: boolean, changes_only?: boolean, field_mapping?: boolean } = {}): T {
    let entries = Object.entries(
      Object.assign({},
        this.attributes(model, { changes_only: changes_only }),
        Object.entries(this._relations)
          .filter(([, v]) => include_navigation || !v.property.parser?.isNavigation())
          .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v.model }), {})
      )
    );
    // Map models and collections
    entries = entries.map(([k, v]) => [k,
      (v instanceof ODataModel) ? v.toEntity({ changes_only, include_navigation, field_mapping }) :
        (v instanceof ODataCollection) ? v.toEntities({ changes_only, include_navigation, field_mapping }) :
          v]);
    // Filter empty
    if (changes_only)
      entries = entries.filter(([, v]) => !Types.isEmpty(v));
    // Create entity
    return entries.reduce((acc, [key, value]) => {
      const name = field_mapping ? this._properties.find(p => p.field === key)?.name || key : key;
      return Object.assign(acc, { [name]: value });
    }, {}) as T
  }

  attributes(model: ODataModel<T>, { changes_only = false }: { changes_only?: boolean } = {}): T {
    return Object.assign({},
      changes_only ? {} : this._attributes,
      this._changes);
  }

  assign(model: ODataModel<T>, data: any = {}, { reset = false }: { reset?: boolean } = {}) {
    this._resetting = reset;
    if (this._resetting) {
      this._changes = {} as T;
    }
    for (let key in data) {
      const value = data[key];
      const name = this._resetting ? this._properties.find(p => p.field === key)?.name || key : key;
      if (value !== null && Types.isObject(value)) {
        const current = (model as any)[name];
        if (
          (!(value instanceof ODataModel) && current instanceof ODataModel) ||
          (!(value instanceof ODataCollection) && current instanceof ODataCollection)) {
          current.assign(value, {reset});
        } else {
          (model as any)[name] = value;
        }
      } else {
        const current = (model as any)[name];
        if (current !== value)
          (model as any)[name] = value;
      }
    }
    this._resetting = false;
  }
  private _modelCollectionFactory<P>(
    { value, property, fieldType, fieldName, collection, resource, meta, reset}: {
    value?: any,
    property?: ODataModelProperty<P>,
    fieldType?: string,
    fieldName?: string,
    collection?: boolean,
    resource?: ODataPropertyResource<P> | ODataNavigationPropertyResource<P>,
    meta?: ODataEntityMeta | ODataEntitiesMeta,
    reset?: boolean
  } = {}): ODataModel<P> | ODataCollection<P, ODataModel<P>> {

    if (property !== undefined && this._resource !== undefined) {
      return property.modelCollectionFactory<T, P>({
        value, reset,
        baseResource: this._resource,
        baseMeta: this._meta});
    }

    // Data
    const data = collection ?
      (value || []) as T[] :
      (value || {}) as T;

    // Meta
    if (meta === undefined) {
      if (fieldName === undefined)
        throw new Error("Need Name");
      const annots = this._meta.property(fieldName) || {};
      meta = collection ?
        new ODataEntitiesMeta(annots, { options: this._meta.options }) :
        new ODataEntityMeta(annots, { options: this._meta.options });
    }

    if (fieldType !== undefined) {
      // Build by Schema
      const schema = this._schema?.api.findStructuredTypeForType(fieldType);
      const Model = schema?.model || ODataModel;
      const Collection = schema?.collection || ODataCollection;
      return collection ?
        new Collection(data, { resource, schema, meta, reset }) :
        new Model(data, { resource, schema, meta, reset });
    } else {
      // Build by magic
      return collection ?
        new ODataCollection(data, { resource, meta: meta as ODataEntitiesMeta, reset }) :
        new ODataModel(data, { resource, meta: meta as ODataEntityMeta, reset });
    }
  }
  private _get<F>(model: ODataModel<T>, property: ODataModelProperty<F>): F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null | undefined {
    const name = property.name;
    const field = property.parser;
    if (field === undefined)
      throw new Error("No Field");
    if (field.isComplexType() || field.isNavigation()) {
      if (this._resetting && !(name in this._relations)) {
        const newModel = this._modelCollectionFactory<F>({property});
        this._relations[name] = { property, model: newModel, subscriptions: this._subscribe<F>(model, property, newModel) };
      }
      return (name in this._relations) ? this._relations[name].model : undefined;
    }
    const attrs = this.attributes(model);
    const value = attrs[name as keyof T] as any;
    return value;
  }

  private _set<F>(model: ODataModel<T>, property: ODataModelProperty<F>, value: F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null) {
    const name = property.name;
    const field = property.parser;
    if (field === undefined)
      throw new Error("No Field");

    if (field.isComplexType() || field.isNavigation()) {
      let newModel = value as ODataModel<F> | ODataCollection<F, ODataModel<F>> | null;
      if (field.isNavigation()) {
        if (model.key() === undefined)
          throw new Error(`Can't set ${name} from unsaved model`);
        if (field.collection)
          throw new Error(`Can't set ${name} to navigation collection, use add instead`);
        newModel = value as ODataModel<F> | null;
        if (newModel?.key() === undefined)
          throw new Error(`Can't set ${name}`);
      }
      const relation = this._relations[name];
      if (relation !== undefined) {
        relation.subscriptions.forEach(sub => sub.unsubscribe());
      }
      const currentModel = relation?.model as ODataModel<any> | ODataCollection<any, ODataModel<any>> | null;
      if (newModel !== null && this._resource !== undefined) {
        if (!(newModel instanceof ODataModel)) {
          newModel = this._modelCollectionFactory({ value, property });
        } else {
          const resource = property.resourceFactory<T, F>(this._resource);
          const meta = property.metaFactory(this._meta);
          newModel.resource(resource);
          newModel.meta(meta as ODataEntityMeta);
        }
        const type = newModel.resource()?.type();
        if (type !== field.type)
          throw new Error(`Can't set ${type} to ${field.type}`);
      }
      this._relations[name] = { model: newModel, property, subscriptions: newModel !== null ? this._subscribe(model, property, newModel) : [] };
      model.change$.emit({ value: newModel, attribute: name, previous: currentModel });
    } else {
      const attrs = this.attributes(model);
      const currentValue = attrs[name as keyof T] as any;
      if (!Types.isEqual(currentValue, value)) {
        if (this._resetting)
          this._attributes[name as keyof T] = value as any;
        else if (Types.isEqual(value, this._attributes[name as keyof T]))
          delete this._changes[name as keyof T];
        else
          this._changes[name as keyof T] = value as any;
        model.change$.emit({ value, attribute: name, previous: currentValue });
      }
    }
  }
  private _subscribe<F>(self: ODataModel<T>, property: ODataModelProperty<F>, value: ODataModel<F> | ODataCollection<F, ODataModel<F>>) {
    const subs = [];
    if (value instanceof ODataModel) {
      //Changes
      subs.push(value.change$.subscribe((event: any) => self.change$.emit({
        value: event.value,
        previous: event.previous,
        attribute: `${property.name}.${event.attribute}`
      })
      ));
    }
    return subs;
  }
}

export class ODataModel<T> {
  //Events
  private _properties!: ModelProperty<any>[];
  private _options: ODataModelOptions<T>;
  change$ = new EventEmitter<{ attribute: string, value: any, previous?: any }>();
  request$ = new EventEmitter<Observable<ODataEntity<T>>>();
  sync$ = new EventEmitter();
  destroy$ = new EventEmitter();
  invalid$ = new EventEmitter<{ [name: string]: string[] }>();
  constructor(data?: any, { resource, schema, meta, reset = false }: {
    resource?: ODataModelResource<T>,
    schema?: ODataStructuredType<T>,
    meta?: ODataEntityMeta,
    reset?: boolean
  } = {}) {
    this._options = new ODataModelOptions(this._properties);
    this.resource(resource);
    this.schema(schema);
    this.meta(meta);
    data = Objects.merge(this.defaults(), data || {});
    this.assign(data, { reset });
  }
  resource(resource?: ODataModelResource<T>) {
    if (resource !== undefined)
      this._options.attach(this, resource);
    return this._options.resource();
  }
  schema(schema?: ODataStructuredType<T>) {
    if (schema !== undefined)
      this._options.bind(this, schema);
    return this._options.schema();
  }
  meta(meta?: ODataEntityMeta) {
    if (meta !== undefined)
      this._options.annotate(this, meta);
    return this._options.meta();
  }
  key() {
    return this._options.key(this.toEntity());
  }

  // Validation
  errors?: { [key: string]: any };
  protected validate(entity: T, { create = false, patch = false }: { create?: boolean, patch?: boolean } = {}) {
    return this._options.validate(entity, {create, patch});
  }
  valid({ create = false, patch = false }: { create?: boolean, patch?: boolean } = {}): boolean {
    this.errors = this.validate(this.toEntity(), {create, patch});
    if (this.errors !== undefined)
      this.invalid$.emit(this.errors);
    return this.errors === undefined;
  }
  protected defaults() {
    return this._options.defaults();
  }
  toEntity({ include_navigation = false, changes_only = false, field_mapping = false}: { include_navigation?: boolean, changes_only?: boolean, field_mapping?: boolean } = {}): T {
    return this._options.toEntity(this, { include_navigation, changes_only, field_mapping });
  }
  attributes({ changes_only = false }: { changes_only?: boolean } = {}): T {
    return this._options.attributes(this, { changes_only });
  }
  assign(data: any = {}, { reset = false }: { reset?: boolean } = {}) {
    this._options.assign(this, data, { reset });
  }
  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toEntity({ include_navigation: true }), { resource: this._options.resource(), meta: this._options.meta() });
  }
  private _request(resource: ODataModelResource<T>, obs$: Observable<ODataEntity<any>>): Observable<this> {
    this.request$.emit(obs$);
    return obs$.pipe(
      map(({ entity, meta }) => {
        this.resource(resource);
        this.meta(meta);
        this.assign(meta.attributes<T>(entity || {}), { reset: true });
        this.sync$.emit();
        return this;
      }));
  }
  fetch(options?: HttpOptions): Observable<this> {
    let resource = this.resource();
    if (resource !== undefined) {
      let obs$: Observable<ODataEntity<any>> = NEVER;
      const key = this.key();
      if (resource instanceof ODataEntityResource) {
        if (key === undefined)
          throw new Error(`Can't fetch entity without key`);
        resource = resource.key(key);
        obs$ = resource.get(options);
      } else if (resource instanceof ODataNavigationPropertyResource) {
        if (key !== undefined)
          resource = resource.key(key);
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
    let resource = this.resource();
    if (resource !== undefined) {
      let obs$: Observable<ODataEntity<any>> = NEVER;
      const key = this.key();
      if (resource instanceof ODataEntityResource) {
        if (!validate || this.valid({create: key === undefined, patch})) {
          const attrs = this.toEntity({ changes_only: patch }) as any;
          if (key !== undefined)
            resource = resource.key(key);
          obs$ = (key === undefined ?
            resource.post(attrs, options) :
            patch ?
              resource.patch(attrs, options) :
              resource.put(attrs, options)
          ).pipe(map(({ entity, meta }) => ({ entity: entity || attrs, meta })));
        } else {
          obs$ = throwError(this.errors);
        }
      }
      return this._request(resource, obs$);
    }
    return throwError("Resource Error");
  }

  destroy(options?: HttpOptions): Observable<this> {
    let resource = this.resource();
    if (resource !== undefined) {
      let obs$: Observable<ODataEntity<any>> = NEVER;
      const key = this.key();
      if (resource instanceof ODataEntityResource) {
        if (key === undefined)
          throw new Error(`Can't fetch entity without key`);
        resource = resource.key(key);
        const attrs = this.toEntity() as any;
        obs$ = resource.delete(Object.assign({ etag: this.meta().etag }, options || {})).pipe(
          map(({ entity, meta }) => ({ entity: entity || attrs, meta })));
      }
      return this._request(resource, obs$).pipe(tap(() => this.destroy$.emit()));
    }
    return throwError("Resource Error");
  }
  get query() {
    return this._options.query;
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
      return resource.cast<S>(type).asModel(this.toEntity({ include_navigation: true }), {meta: this.meta()});
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
