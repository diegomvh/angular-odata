import { EMPTY, Observable, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  ODataEntityResource,
  ODataNavigationPropertyResource,
  HttpOptions,
  ODataEntityAnnotations,
  ODataEntity,
  ODataActionResource,
  ODataFunctionResource,
  Select,
  Expand,
  OptionHandler,
  HttpCallableOptions} from '../resources/index';

import { ODataCollection } from './collection';
import { Objects, Types } from '../utils';
import { EventEmitter } from '@angular/core';
import { ModelOptions, ODataModelEvent, ODataModelOptions, ODataModelRelation, ODataModelResource } from './options';
import { EntityKey } from '../types';

// @dynamic
export class ODataModel<T> {
  // Properties
  static options: ModelOptions;
  static meta: ODataModelOptions<any>;
  // Events
  _attributes: {[name: string]: any} = {};
  _changes: {[name: string]: any} = {};
  _relations: { [name: string]: ODataModelRelation } = {};
  _resource?: ODataModelResource<T>;
  _annotations!: ODataEntityAnnotations;
  _resetting: boolean = false;
  _silent: boolean = false;
  _meta: ODataModelOptions<T>;
  events$ = new EventEmitter<ODataModelEvent<T>>();
  constructor(data: Partial<T> | {[name: string]: any} = {}, { resource, annots, reset = false }: {
    resource?: ODataModelResource<T>,
    annots?: ODataEntityAnnotations,
    reset?: boolean
  } = {}) {

    const Klass = this.constructor as typeof ODataModel;
    if (Klass.meta === undefined)
      throw new Error(`Can't create model without metadata`);
    this._meta = Klass.meta;
    this._meta.bind(this);

    (<any>this)[this._meta.cid] = (<any>data)[this._meta.cid] || Objects.uniqueId("c");

    this.resource(resource);
    this.annots(annots || new ODataEntityAnnotations());

    let attrs = this.annots().attributes<T>(data);
    let defaults = this.defaults();

    this.assign(Objects.merge(defaults, attrs), { reset });
  }

  equals(other: ODataModel<T>) {
    const thisKey = this.key();
    const otherKey = other.key();
    return this === other || (<any>this)[this._meta.cid] === (<any>other)[this._meta.cid] || (thisKey !== undefined && otherKey !== undefined && Types.isEqual(thisKey, otherKey));
  }

  resource(resource?: ODataModelResource<T>) {
    if (resource !== undefined)
      this._meta.attach(this, resource);
    return this._meta.resource(this);
  }

  schema() {
    return this._meta.schema;
  }

  annots(annots?: ODataEntityAnnotations) {
    if (annots !== undefined) this._annotations = annots;
    return this._annotations;
  }

  key({field_mapping = false, resolve = true}: {field_mapping?: boolean, resolve?: boolean} = {}): EntityKey<T> | {[name: string]: any} | undefined {
    return this._meta.resolveKey(this, {field_mapping, resolve});
  }

  // Validation
  _errors?: { [key: string]: any };
  protected validate({
    create = false,
    patch = false,
    navigation = false
  }: {
    create?: boolean,
    patch?: boolean,
    navigation?: boolean
  } = {}) {
    return this._meta.validate(this, {create, patch, navigation});
  }

  valid({
    create = false,
    patch = false,
    navigation = false
  }: {
    create?: boolean,
    patch?: boolean,
    navigation?: boolean
  } = {}): boolean {
    this._errors = this.validate({create, patch, navigation});
    if (this._errors !== undefined)
      this.events$.emit({name: 'invalid', model: this, value: this._errors, options: {create, patch}});
    return this._errors === undefined;
  }

  protected defaults() {
    return this._meta.defaults(this);
  }

  toEntity({
    client_id = false,
    include_navigation = false,
    include_concurrency = false,
    include_key = false,
    changes_only = false,
    field_mapping = false
  }: {
    client_id?: boolean,
    include_navigation?: boolean,
    include_concurrency?: boolean,
    include_key?: boolean,
    changes_only?: boolean,
    field_mapping?: boolean
  } = {}): T | {[name: string]: any} {
    return this._meta.toEntity(this, { client_id, include_navigation, include_concurrency, include_key, changes_only, field_mapping});
  }

  attributes({
    changes_only = false,
    include_concurrency = false,
    include_computed = false,
    field_mapping = false
  }: {
    changes_only?: boolean,
    include_concurrency?: boolean,
    include_computed?: boolean,
    field_mapping?: boolean
  } = {}): {[name: string]: any} {
    return this._meta.attributes(this, { changes_only, field_mapping, include_concurrency, include_computed });
  }

  set(path: string | string[], value: any) {
    const pathArray = (Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)) as any[];
    if (pathArray.length === 0) return undefined;
    if (pathArray.length > 1) {
      const model = (<any>this)[pathArray[0]];
      return model.set(pathArray.slice(1), value);
    }
    if (pathArray.length === 1) {
      return ((<any>this)[pathArray[0]] = value);
    }
  }

  get(path: string | string[]): any {
    const pathArray = (Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)) as any[];
    if (pathArray.length === 0) return undefined;
    const value = (<any>this)[pathArray[0]];
    if (pathArray.length > 1 && (value instanceof ODataModel || value instanceof ODataCollection)) {
      return value.get(pathArray.slice(1));
    }
    return value;
  }

  assign(entity: Partial<T> | {[name: string]: any}, { reset = false, silent = false }: { reset?: boolean, silent?: boolean } = {}) {
    return this._meta.assign(this, entity, { reset, silent });
  }

  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(
      this.toEntity({
        include_navigation: true,
        include_concurrency: true
      }), {
        resource: this.resource(),
        annots: this.annots()
      });
  }

  private _request(obs$: Observable<ODataEntity<any>>): Observable<this> {
    this.events$.emit({ name: 'request', model: this, value: obs$ });
    return obs$.pipe(
      map(({ entity, annots }) => {
        this.annots(annots);
        this.assign(annots.attributes<T>(entity || {}), { reset: true });
        this.events$.emit({name: 'sync', model: this });
        return this;
      }));
  }

  fetch({
    asEntity,
    ...options
  }: HttpOptions & {
    asEntity?: boolean,
    options?: HttpOptions
  } = {}): Observable<this> {
    let resource = this._meta.resource(this, {toEntity: asEntity});
    if (resource === undefined)
      return throwError("fetch: Resource is undefined");

    let obs$: Observable<ODataEntity<any>>;
    if (resource instanceof ODataEntityResource) {
      if (!resource.hasKey())
        return throwError("fetch: Can't fetch model without key");
      obs$ = resource.get(options);
    } else if (resource instanceof ODataNavigationPropertyResource) {
      obs$ = resource.get({responseType: 'entity', ...options});
    } else {
      obs$ = resource.get({responseType: 'entity', ...options});
    }
    return this._request(obs$);
  }

  save({
    asEntity,
    patch = false,
    navigation = false,
    validate = true,
    ...options
  }: HttpOptions & {
    asEntity?: boolean,
    patch?: boolean,
    navigation?: boolean,
    validate?: boolean,
    options?: HttpOptions
  } = {}): Observable<this> {
    let resource = this._meta.resource(this, {toEntity: asEntity});
    if (resource === undefined)
      return throwError("save: Resource is undefined");
    if (!(resource instanceof ODataEntityResource))
      return throwError("save: Resource type ODataEntityResource needed");

    const isNew = !resource.hasKey();
    let obs$: Observable<ODataEntity<any>>;
    if (!validate || this.valid({create: isNew, patch, navigation})) {
      const _entity = this.toEntity({ changes_only: patch, field_mapping: true, include_concurrency: true, include_navigation: navigation }) as T;
      obs$ = (
        isNew ? resource.post(_entity, options) :
        patch ? resource.patch(_entity, options) :
        resource.put(_entity, options)
      ).pipe(map(({ entity, annots }) => ({ entity: entity || _entity, annots })));
    } else {
      obs$ = throwError(this._errors);
    }
    return this._request(obs$);
  }

  destroy({
    asEntity,
    ...options
  }: HttpOptions & {
    asEntity?: boolean,
    options?: HttpOptions
  } = {}): Observable<this> {
    let resource = this._meta.resource(this, {toEntity: asEntity});
    if (resource === undefined)
      return throwError("destroy: Resource is undefined");
    if (!(resource instanceof ODataEntityResource))
      return throwError("destroy: Resource type ODataEntityResource needed");
    if (!resource.hasKey())
      return throwError("destroy: Can't destroy model without key");

    const _entity = this.toEntity({field_mapping: true}) as T;
    const obs$ = resource.delete(Object.assign({ etag: this.annots().etag }, options || {})).pipe(
      map(({ entity, annots }) => ({ entity: entity || _entity, annots })));
    return this._request(obs$).pipe(tap(() => this.events$.emit({name: 'destroy', model: this})));
  }

  query(func: (q:
    { select(opts?: Select<T>): OptionHandler<Select<T>>;
      expand(opts?: Expand<T>): OptionHandler<Expand<T>>;
      format(opts?: string): OptionHandler<string>;
    }) => void) {
    const resource = this._meta.resource(this, {toEntity: false});
    if (resource !== undefined)
      return this._meta.query(this, resource, func);
  }

  hasChanged() {
    return this._meta.hasChanged(this);
  }

  private _call<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R> | ODataActionResource<P, R>,
    responseType: 'property' | 'model' | 'collection' | 'none',
    { expand, select, ...options }: HttpCallableOptions<R> = {}
  ) {
    if (expand !== undefined) resource.query.expand(expand);
    if (select !== undefined) resource.query.select(select);
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
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean
    } & HttpCallableOptions<R> = {}): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this._meta.resource(this, {toEntity: asEntity});
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      return this._call(params, resource.function<P, R>(name), responseType, options);
    }
    return throwError("Can't call function without ODataEntityResource with key");
  }

  protected callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean
    } & HttpCallableOptions<R> = {}): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this._meta.resource(this, {toEntity: asEntity});
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      return this._call(params, resource.action<P, R>(name), responseType, options);
    }
    return throwError("Can't call action without ODataEntityResource with key");
  }

  // As Derived
  protected asDerived<S>(type: string): ODataModel<S> {
    //TODO: Derived
    const resource = this._meta.resource(this, {toEntity: false});
    if (resource instanceof ODataEntityResource) {
      return resource.cast<S>(type).asModel(this.toEntity({ include_navigation: true, include_concurrency: true }), {annots: this.annots()});
    }
    throw new Error(`Can't cast to derived model without ODataEntityResource`);
  }

  protected getBinding<S>(
    name: string,
    responseType: 'model' | 'collection',
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean
    } & HttpOptions = {}): Observable<ODataModel<S> | ODataCollection<S, ODataModel<S>> | null> {
    const resource = this._meta.resource(this, {toEntity: asEntity});
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      const nav = resource.navigationProperty<S>(name);
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
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean
    } & HttpOptions = {}): Observable<this> {
    const field = this._meta.fields({include_navigation: true}).find(p => p.name === name);
    if (field === undefined || !field.navigation)
      throw new Error(`Can't find navigation property ${name}`);
    if (field.collection)
      throw new Error(`Can't set ${field.name} to collection, use add`);

    const resource = this._meta.resource(this, {toEntity: asEntity});
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      let ref = (field.resourceFactory<T, any>(resource) as ODataNavigationPropertyResource<any>).reference();
      const etag = this.annots().etag;
      const obs$ = (model instanceof ODataModel) ?
        ref.set(model._meta.resource(model, {toEntity: true}) as ODataEntityResource<P>, {etag, ...options}) :
        ref.unset({etag, ...options});
      this.events$.emit({name: 'request', model: this, value: obs$ });
      return obs$.pipe(
        map(() => {
          let attrs: any = { [name]: model };
          if (field.referential !== undefined) {
            attrs[field.referential] = (model instanceof ODataModel) ? model.key() : model;
          }
          this.assign(attrs, { reset: true });
          this.events$.emit({name: 'sync', model: this});
          return this;
        }
        ));
      }
    return throwError("Can't set reference without ODataEntityResource");
  }

  protected getReference<P>(
    name: string,
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean
    } & HttpOptions = {}): Observable<ODataModel<P>> {
    const field = this._meta.fields({include_navigation: true}).find(p => p.name === name);
    if (field === undefined || !field.navigation)
      throw new Error(`Can't find navigation property ${name}`);
    if (field.collection)
      throw new Error(`Can't get ${field.name} collection`);

    let model: ODataModel<P> | undefined;
    if (asEntity) {
      if (field.referential !== undefined && field.referenced !== undefined) {
        let key = (<any>this)[field.referential];
        if (key !== undefined) {
          const resource = field.meta?.modelResourceFactory({fromSet: asEntity});
          model = field.modelCollectionFactory<T, P>({
            value: {[field.referenced]: key},
            baseSchema: this.schema(),
            baseAnnots: this.annots()
          }) as ODataModel<P>;
          model.resource(resource);
        }
      }
    } else {
      model = field.modelCollectionFactory<T, P>({
        baseResource: this.resource(),
        baseSchema: this.schema(),
        baseAnnots: this.annots()
      }) as ODataModel<P>;
    }
    if (model !== undefined) {
      (<any>this)[field.name] = model;
      return model.fetch(options);
    }
    return throwError("Can't get reference without ODataEntityResource");
  }
}
