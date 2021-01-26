import { map, switchMap, tap } from 'rxjs/operators';
import { Observable, EMPTY, NEVER, of } from 'rxjs';

import {
  ODataResource,
  ODataEntitySetResource,
  ODataEntityResource,
  ODataNavigationPropertyResource,
  ODataFunctionResource,
  ODataEntitiesMeta,
  HttpOptions,
  HttpEntitiesOptions,
  ODataEntities
} from '../resources/index';

import { ODataModel } from './model';
import { EventEmitter } from '@angular/core';

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  private __resource: ODataResource<T> | null;
  private __meta: ODataEntitiesMeta;
  private __models: M[];
  get models() {
    return [...this.__models];
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
  add$ = new EventEmitter<M>();
  remove$ = new EventEmitter<M>();
  update$ = new EventEmitter();
  request$ = new EventEmitter<Observable<ODataEntities<T>>>();
  sync$ = new EventEmitter();
  reset$ = new EventEmitter();

  constructor(values?: any[], options: { resource?: ODataResource<T>, meta?: ODataEntitiesMeta } = {}) {
    this.__resource = null;
    this.__models = [] as M[];
    if (options.resource instanceof ODataResource)
      this.attach(options.resource);
    this.__meta = options.meta || new ODataEntitiesMeta({}, {options: options.resource?.api.options});
    this.__models = this.parse(values || []).map(e => this.__model(e));
  }

  attach(resource: ODataResource<T>) {
    if (this.__resource !== null && this.__resource.type() !== resource.type() && !resource.isSubtypeOf(this.__resource))
      throw new Error(`Can't reattach ${resource.type()} to ${this.__resource.type()}`);
    this.__resource = resource;
    return this;
  }

  get _resource() {
    return this.__resource !== null ? this.__resource.clone() as ODataResource<T> : null;
  }

  private __model(attrs: T): M {
    let resource = this.__resource ? this.__resource.clone() : null;
    if (resource instanceof ODataEntitySetResource)
      resource = resource.entity();
    const meta = this.__meta.entity(attrs);
    if (resource instanceof ODataEntityResource || resource instanceof ODataNavigationPropertyResource) {
      resource.segment.key(attrs);
      if (meta.type !== undefined) {
        resource.segment.entitySet().type(meta.type);
      }
    }
    return (resource ? resource.clone().asModel(attrs, meta) : attrs) as M;
  }
  protected parse(values: Object[]): T[] {
    return values as T[];
  }

  toEntities() {
    return this.__models.map(model => model.toEntity());
  }

  clone() {
    let options: { resource?: ODataResource<T>, meta?: ODataEntitiesMeta } = {};
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
          value: models[pointer++]
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
        this.__models = this.parse(entities || []).map(e => this.__model(e));
        this.sync$.emit();
        return this;
      }));
  }

  fetch(options?: HttpOptions): Observable<this> {
    let obs$: Observable<ODataEntities<any>> = NEVER;
    if (this.__resource instanceof ODataEntitySetResource) {
      obs$ = this.__resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ withCount: true }, options || {}));
    } else if (this.__resource instanceof ODataNavigationPropertyResource) {
      obs$ = this.__resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities', withCount: true }, options || {}));
    } else if (this.__resource instanceof ODataFunctionResource) {
      obs$ = this.__resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities', withCount: true }, options || {}));
    }
    return this.__request(obs$);
  }

  next(options?: HttpOptions) {
    if (this.state.skip) {
      this._query.skip(this.state.skip);
      return this.fetch(options);
    }
    else if (this.state.skiptoken) {
      this._query.skiptoken(this.state.skiptoken);
      return this.fetch(options);
    }
    return EMPTY;
  }

  all(options?: HttpOptions): Observable<this> {
    let obs$: Observable<any> = NEVER;
    if (this.__resource instanceof ODataEntitySetResource || this.__resource instanceof ODataNavigationPropertyResource) {
      obs$ = this.__resource.all(options)
        .pipe(map(entities => ({entities, meta: new ODataEntitiesMeta({}, {options: this.__resource?.api.options})})));
    }
    return this.__request(obs$);
  }

  //TODO: add and remove like backbone
  add(model: M): Observable<this> {
    let obs$: Observable<any> = EMPTY;
    if (this.__resource instanceof ODataNavigationPropertyResource) {
      let ref = this.__resource.reference();
      obs$ = ref.add(model._resource as ODataEntityResource<T>);
    }
    return obs$.pipe(map(() => {
      this.__models.push(model);
      this.add$.emit(model);
      return this;
    }));
  }

  remove(model: M) {
    let obs$: Observable<any> = EMPTY;
    if (this.__resource instanceof ODataNavigationPropertyResource) {
      let ref = this.__resource.reference();
      obs$ = ref.remove(model._resource as ODataEntityResource<T>);
    }
    return obs$.pipe(map(() => {
      const index = this.__models.indexOf(model);
      this.__models.splice(index, 1);
      this.remove$.emit(model);
      return this;
    }));
  }

  create(attrs: T) {
    const model = this.__model(attrs);
    if (model.isValid())
      return model.save()
        .pipe(tap(model => this.add(model)))
    this.add(model);
    return of(model);
  }

  // Count
  count() {
    return (this.__resource as ODataEntitySetResource<any>).count().get();
  }

  get _schema() {
    if (!this.__resource)
      throw new Error(`Can't config without ODataResource`);
    return (this.__resource as ODataEntitySetResource<T>).schema;
  }

  get _segment() {
    if (!this.__resource)
      throw new Error(`Can't call without ODataResource`);
    return (this.__resource as ODataEntitySetResource<T>).segment;
  }

  get _query() {
    if (!this.__resource)
      throw new Error(`Can't query without ODataResource`);
    return (this.__resource as ODataEntitySetResource<T>).query;
  }

  // Function
  protected _function<P, R>(path: string) {
    if (!this.__resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    return (this.__resource as ODataEntitySetResource<T>).function<P, R>(path);
  }

  // Action
  protected _action<P, R>(path: string) {
    if (!this.__resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    return (this.__resource as ODataEntitySetResource<T>).action<P, R>(path);
  }
}
