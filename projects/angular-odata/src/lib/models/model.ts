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
  ODataActionResource,
  ODataFunctionResource
} from '../resources/index';

import { ODataCollection } from './collection';
import { Types } from '../utils/types';
import { Objects } from '../utils';
import { EventEmitter } from '@angular/core';
import { ODataStructuredType } from '../schema';
import { ODataStructuredTypeFieldParser } from '../parsers';
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
  private _attributes: {[name: string]: any} = {};
  private _changes: {[name: string]: any} = {};
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

    // Attach relations
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

  resource(model: ODataModel<T>) {
    let resource = this._resource?.clone();
    const key = this.key(model, {field_mapping: true});
    if (key !== undefined && (resource instanceof ODataEntityResource || resource instanceof ODataNavigationPropertyResource)) {
      resource = resource.key(key);
    }
    return resource;
  }

  findProperty(predicate: (p: ODataModelProperty<any>) => boolean) {
    return this._properties.find(predicate);
  }

  bind(model: ODataModel<T>, schema: ODataStructuredType<T>) {
    if (this._schema === undefined || schema.type() !== this._schema.type()) {
      // Bind Properties
      const fields = schema.fields({ include_navigation: true, include_parents: true });
      for (var field of fields) {
        let prop = this.findProperty(p => p.field === field.name);
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

  schema(model: ODataModel<T>): ODataStructuredType<T> | undefined {
    return this._schema;
  }

  annotate(model: ODataModel<T>, meta: ODataEntityMeta) {
    if (meta.type !== undefined && meta.type !== this._resource?.type()) {
      const schema = this._resource?.api.findStructuredTypeForType<any>(meta.type);
      if (schema !== undefined) this.bind(model, schema);
    }
    this._meta = meta;
  }

  meta(model: ODataModel<T>) {
    return this._meta?.clone();
  }

  get query() {
    if (this._resource === undefined)
      throw new Error(`Can't query without ODataResource`);
    return this._resource.query;
  }

  key(model: ODataModel<T>, {field_mapping = false}: {field_mapping?: boolean} = {}) {
    //TODO: field_mapping
    return this.schema(model)?.resolveKey(model.toEntity({field_mapping}));
  }

  validate(model: ODataModel<T>, { create = false, patch = false }: { create?: boolean, patch?: boolean } = {}) {
    //TODO: field_mapping
    return this.schema(model)?.validate(model.toEntity({field_mapping: true}) as T, { create, patch });
  }

  defaults(model: ODataModel<T>) {
    return this.schema(model)?.defaults() || {};
  }

  toEntity(model: ODataModel<T>, {
    include_navigation = false,
    changes_only = false,
    field_mapping = false
  }: { include_navigation?: boolean, changes_only?: boolean, field_mapping?: boolean } = {}): T | {[name: string]: any} {
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
      const name = field_mapping ? this.findProperty(p => p.name === key)?.field || key : key;
      return Object.assign(acc, { [name]: value });
    }, {}) as T
  }

  attributes(model: ODataModel<T>, { changes_only = false }: { changes_only?: boolean } = {}): {[name: string]: any} {
    return Object.assign({},
      changes_only ? {} : this._attributes,
      this._changes);
  }

  assign(model: ODataModel<T>, data: {[name: string]: any} = {}, { reset = false }: { reset?: boolean } = {}) {
    this._resetting = reset;
    if (this._resetting) {
      this._changes = {} as T;
    }
    for (let key in data) {
      const value = data[key];
      const name = this._resetting ? this.findProperty(p => p.field === key)?.name || key : key;
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
    return attrs[name];
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
      const currentValue = attrs[name];
      if (!Types.isEqual(currentValue, value)) {
        if (this._resetting)
          this._attributes[name] = value;
        else if (Types.isEqual(value, this._attributes[name]))
          delete this._changes[name];
        else
          this._changes[name] = value;
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
    return this._options.resource(this);
  }

  schema(schema?: ODataStructuredType<T>) {
    if (schema !== undefined)
      this._options.bind(this, schema);
    return this._options.schema(this);
  }

  meta(meta?: ODataEntityMeta) {
    if (meta !== undefined)
      this._options.annotate(this, meta);
    return this._options.meta(this);
  }

  key() {
    return this._options.key(this);
  }

  // Validation
  errors?: { [key: string]: any };
  protected validate({ create = false, patch = false }: { create?: boolean, patch?: boolean } = {}) {
    return this._options.validate(this, {create, patch});
  }

  valid({ create = false, patch = false }: { create?: boolean, patch?: boolean } = {}): boolean {
    this.errors = this.validate({create, patch});
    if (this.errors !== undefined)
      this.invalid$.emit(this.errors);
    return this.errors === undefined;
  }
  protected defaults() {
    return this._options.defaults(this);
  }
  toEntity({ include_navigation = false, changes_only = false, field_mapping = false}: { include_navigation?: boolean, changes_only?: boolean, field_mapping?: boolean } = {}): T | {[name: string]: any} {
    return this._options.toEntity(this, { include_navigation, changes_only, field_mapping });
  }
  attributes({ changes_only = false }: { changes_only?: boolean } = {}): {[name: string]: any} {
    return this._options.attributes(this, { changes_only });
  }
  assign(data: any = {}, { reset = false }: { reset?: boolean } = {}) {
    this._options.assign(this, data, { reset });
  }
  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toEntity({ include_navigation: true }), { resource: this.resource(), meta: this.meta() });
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
      if (resource instanceof ODataEntityResource) {
        if (!resource.segment.entitySet().hasKey())
          return throwError("Can't fetch model without key");
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
    return throwError("Resource is undefined");
  }

  save(
    { patch = false, validate = true, ...options }: HttpOptions & { patch?: boolean, validate?: boolean } = {}
  ): Observable<this> {
    let resource = this.resource();
    if (resource !== undefined) {
      let obs$: Observable<ODataEntity<any>> = NEVER;
      if (resource instanceof ODataEntityResource) {
        if (!validate || this.valid({create: !resource.segment.entitySet().hasKey(), patch})) {
          const _entity = this.toEntity({ changes_only: patch, field_mapping: true }) as T;
          obs$ = (!resource.segment.entitySet().hasKey() ?
            resource.post(_entity, options) :
            patch ?
              resource.patch(_entity, options) :
              resource.put(_entity, options)
          ).pipe(map(({ entity, meta }) => ({ entity: entity || _entity, meta })));
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
      if (resource instanceof ODataEntityResource) {
        if (!resource.segment.entitySet().hasKey())
          return throwError("Can't destroy model without key");
        const _entity = this.toEntity({field_mapping: true}) as T;
        obs$ = resource.delete(Object.assign({ etag: this.meta().etag }, options || {})).pipe(
          map(({ entity, meta }) => ({ entity: entity || _entity, meta })));
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
    let resource = this.resource();
    if (resource instanceof ODataEntityResource && resource.segment.entitySet().hasKey()) {
      return this._call(params, resource.function<P, R>(name), responseType, options);
    }
    return throwError("Can't call function without ODataEntityResource with key");
  }

  protected callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    let resource = this.resource();
    const key = this.key();
    if (resource instanceof ODataEntityResource && resource.segment.entitySet().hasKey()) {
      return this._call(params, resource.action<P, R>(name), responseType, options);
    }
    return throwError("Can't call action without ODataEntityResource with key");
  }

  // As Derived
  protected asDerived<S>(type: string): ODataModel<S> {
    const resource = this.resource();
    if (resource instanceof ODataEntityResource) {
      return resource.cast<S>(type).asModel(this.toEntity({ include_navigation: true }), {meta: this.meta()});
    }
    throw new Error(`Can't cast to derived model without ODataEntityResource`);
  }

  protected getBinding<S>(
    path: string,
    responseType: 'model' | 'collection',
    options?: HttpOptions
  ): Observable<ODataModel<S> | ODataCollection<S, ODataModel<S>> | null> {
    let resource = this.resource();
    if (resource instanceof ODataEntityResource && resource.segment.entitySet().hasKey()) {
      const nav = resource.navigationProperty<S>(path);
      switch (responseType) {
        case 'model':
          return nav.fetchModel(options);
        case 'collection':
          return nav.fetchCollection(options);
      }
    }
    return throwError("Can't binding without ODataEntityResource with key");
  }

  // Set Reference
  protected setReference<P>(
    name: string,
    model: ODataModel<P> | null,
    options?: HttpOptions
  ): Observable<this> {
    const prop = this._options.findProperty(p => p.name === name);
    if (prop === undefined)
      throw new Error(`Can't find property ${name}`);
    if (prop.parser?.collection)
      throw new Error(`Can't set ${prop.name} to collection, use add`);

    const resource = this.resource();
    if (resource instanceof ODataEntityResource && resource.segment.entitySet().hasKey()) {
      let ref = resource.navigationProperty(prop.field).reference();
      const etag = this.meta().etag;
      const opts = Object.assign({ etag }, options || {});
      const obs$ = (model instanceof ODataModel) ?
        ref.set(model.resource() as ODataEntityResource<P>, opts) :
        ref.unset(opts);
      this.request$.emit(obs$);
      return obs$.pipe(
        map(() => {
          let attrs: any = { [name]: model };
          if (prop.field !== undefined) {
            attrs[prop.field] = (model instanceof ODataModel) ? model.key() : model;
          }
          this.assign(attrs, { reset: true });
          this.sync$.emit();
          return this;
        }
        ));
      }
    return throwError("Can't binding without ODataEntityResource with key");
  }
}
