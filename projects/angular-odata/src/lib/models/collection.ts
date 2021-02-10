import { map, switchMap, tap } from 'rxjs/operators';
import { Observable, EMPTY, NEVER, of, Subscription, merge } from 'rxjs';

import {
  ODataEntitySetResource,
  ODataEntityResource,
  ODataNavigationPropertyResource,
  ODataEntitiesMeta,
  HttpOptions,
  HttpEntitiesOptions,
  ODataEntities,
  ODataPropertyResource,
  ODataActionResource,
  ODataFunctionResource
} from '../resources/index';

import { ODataModel, ODataModelResource } from './model';
import { EventEmitter } from '@angular/core';
import { ODataStructuredType } from '../schema/structured-type';
import { EntityKey } from '../types';
import { Types } from '../utils/types';

type ODataCollectionResource<T> = ODataEntitySetResource<T> | ODataNavigationPropertyResource<T> | ODataPropertyResource<T>;

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  private __resource?: ODataCollectionResource<T>;
  private __schema?: ODataStructuredType<T>;
  private __meta: ODataEntitiesMeta;
  private __models: { model: M, key?: EntityKey<T>, subscriptions: Subscription[] }[] = [];

  get models() {
    return this.__models.map(m => m.model);
  }

  get state() {
    return {
      top: this.__meta.top,
      skip: this.__meta.skip,
      skiptoken: this.__meta.skiptoken,
      records: this.__meta.count,
    };
  }

  //Events
  add$ = new EventEmitter<M[]>();
  remove$ = new EventEmitter<M[]>();
  change$ = new EventEmitter<M[]>();
  reset$ = new EventEmitter<M[]>();
  update$ = merge<M[]>(this.add$, this.remove$, this.change$, this.reset$);
  request$ = new EventEmitter<Observable<ODataEntities<T>>>();
  sync$ = new EventEmitter();
  invalid$ = new EventEmitter<{model: M, errors: {[name: string]: string[]}}>();

  constructor(data?: any, options: {
    resource?: ODataCollectionResource<T>,
    schema?: ODataStructuredType<T>,
    meta?: ODataEntitiesMeta,
  } = {}) {
    data = data || {};
    if (options.schema)
      this.bind(options.schema);
    if (options.resource)
      this.attach(options.resource);
    this.__meta = options.meta || new ODataEntitiesMeta(data, {options: options.resource?.api.options});
    if (!Array.isArray(data))
      data = this.__meta.data(data) || [];
    this.assign(data);
  }

  bind(schema: ODataStructuredType<T>) {
    this.__schema = schema;
  }

  attach(resource: ODataCollectionResource<T>) {
    if (this.__resource !== undefined && this.__resource.type() !== resource.type() && !resource.isSubtypeOf(this.__resource))
      throw new Error(`Can't reattach ${resource.type()} to ${this.__resource.type()}`);
    this.__resource = resource;
    const schema = this.__resource.schema;
    if (schema !== undefined)
      this.bind(schema);
    return this;
  }

  _resource() {
    return this.__resource !== undefined ? this.__resource.clone() as ODataCollectionResource<T> : null;
  }

  private __modelFactory(attrs: T): M {
    const meta = this.__meta.entity(attrs);
    const schema = this.__schema;
    const Model = schema?.model || ODataModel;
    let resource: ODataModelResource<T> | undefined;
    if (this.__resource) {
      if (this.__resource instanceof ODataEntitySetResource)
        resource = this.__resource.entity(attrs);
      else
        resource = this.__resource.clone();
      if (meta.type !== undefined) {
        resource.segment.entitySet().type(meta.type);
      }
      return resource.asModel(attrs, meta);
    }
    return new Model(attrs, {resource, schema, meta}) as M;
  }

  protected parse(entities: T[]): M[] {
    return entities.map(e => this.__modelFactory(e));
  }

  toEntities() {
    return this.__models.map(m => m.model.toEntity());
  }

  clone() {
    let options: { resource?: ODataCollectionResource<T>, meta?: ODataEntitiesMeta } = {};
    if (this.__resource)
      options.resource = this.__resource.clone();
    if (this.__meta)
      options.meta = this.__meta.clone();
    let Ctor = <typeof ODataCollection>this.constructor;
    return new Ctor(this.models, options);
  }

  // Iterable
  public [Symbol.iterator]() {
    let pointer = 0;
    let models = this.__models;
    return {
      next(): IteratorResult<M> {
        return {
          done: pointer === models.length,
          value: models[pointer++].model
        };
      }
    }
  }

  // Requests
  private __request(obs$: Observable<ODataEntities<any>>): Observable<this> {
    this.request$.emit(obs$);
    return obs$.pipe(
      map(({entities, meta}) => {
        this.__meta = meta;
        this.assign(entities || []);
        this.sync$.emit();
        return this;
      }));
  }

  fetch(options?: HttpOptions & {withCount?: boolean}): Observable<this> {
    let obs$: Observable<ODataEntities<any>> = NEVER;
    if (this.__resource instanceof ODataEntitySetResource) {
      obs$ = this.__resource.get(options);
    } else if (this.__resource instanceof ODataNavigationPropertyResource) {
      obs$ = this.__resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities' }, options || {}));
    } else if (this.__resource instanceof ODataPropertyResource) {
      obs$ = this.__resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities' }, options || {}));
    }
    return this.__request(obs$);
  }

  next(options?: HttpOptions) {
    const resource = this._resource();
    if (resource !== null) {
      if (this.state.skip)
        resource.query.skip(this.state.skip);
      if (this.state.skiptoken)
        resource.query.skiptoken(this.state.skiptoken);
      this.attach(resource);
      return this.fetch(options);
    }
    return NEVER;
  }

  fetchAll(options?: HttpOptions): Observable<this> {
    let obs$: Observable<any> = NEVER;
    if (this.__resource instanceof ODataEntitySetResource || this.__resource instanceof ODataNavigationPropertyResource) {
      obs$ = this.__resource.fetchAll(options)
        .pipe(map(entities => ({entities, meta: new ODataEntitiesMeta({}, {options: this.__resource?.api.options})})));
    }
    return this.__request(obs$);
  }

  //TODO: add and remove like backbone
  add(model: M) {
    if (this.__resource instanceof ODataNavigationPropertyResource) {
      let ref = this.__resource.reference();
      ref.add(model._resource() as ODataEntityResource<T>).toPromise();
    }
    this.__models.push({model, key: model._key(), subscriptions: this.__subscribe(model)});
    this.add$.emit([model]);
  }

  remove(model: M) {
    if (this.__resource instanceof ODataNavigationPropertyResource) {
      let ref = this.__resource.reference();
      ref.remove(model._resource() as ODataEntityResource<T>).toPromise();
    }
    const key = model._key();
    const entry = this.__models.find(m => m.model === model || (!Types.isEmpty(m.key) && Types.isEqual(m.key, key)));
    if (entry !== undefined) {
      const index = this.__models.indexOf(entry);
      this.__models.splice(index, 1);
      entry.subscriptions.forEach(s => s.unsubscribe());
      this.remove$.emit([model]);
    }
  }

  create(attrs?: T) {
    const model = this.__modelFactory((attrs || {}) as T);
    if (model.isValid())
      model.save().toPromise();
    this.add(model);
    return model;
  }

  // Count
  count() {
    return (this.__resource as ODataEntitySetResource<any>).count().fetch();
  }

  assign(data: any) {
    const models = this.parse(data) || [];
    this.__models.forEach(e => e.subscriptions.forEach(s => s.unsubscribe()));
    this.__models = models.map(model => {
      return {model, key: model._key(), subscriptions: this.__subscribe(model)};
    });
    this.reset$.emit(models);
  }
  protected _schema(): ODataStructuredType<T> | undefined {
    return this.__schema ? this.__schema : undefined;
  }
  get _query() {
    if (!this.__resource)
      throw new Error(`Can't query without ODataResource`);
    return this.__resource.query;
  }

  private __call<P, R>(
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

  protected _callFunction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    if (this.__resource instanceof ODataEntitySetResource) {
      const resource = this.__resource.function<P, R>(name);
      return this.__call(params, resource, responseType, options);
    }
    throw new Error(`Can't function without ODataEntitySetResource`);
  }

  protected _callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    if (this.__resource instanceof ODataEntitySetResource) {
      const resource = this.__resource.action<P, R>(name);
      return this.__call(params, resource, responseType, options);
    }
    throw new Error(`Can't action without ODataEntitySetResource`);
  }

  private __subscribe<E>(model: M) {
    const subscriptions = [];
    subscriptions.push(
      model.change$.subscribe((event: {attribute: string, value: any, previous?: any}) => this.change$.emit([model]))
    );
    subscriptions.push(
      model.destroy$.subscribe(() => this.remove(model))
    );
    subscriptions.push(
      model.invalid$.subscribe((errors: {[name: string]: string[]}) => this.invalid$.emit(Object.assign({model}, {errors})))
    );
    return subscriptions;
  }
}
