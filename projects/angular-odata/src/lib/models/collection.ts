import { map } from 'rxjs/operators';
import { Observable, EMPTY } from 'rxjs';

import {
  ODataResource,
  ODataEntitySetResource,
  ODataEntityResource,
  ODataNavigationPropertyResource,
  ODataFunctionResource,
  ODataEntitiesMeta,
  HttpOptions,
  HttpEntitiesOptions
} from '../resources/index';

import { ODataModel } from './model';
import { EventEmitter } from '@angular/core';

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  private __resource: ODataResource<T> | null;
  private __meta!: ODataEntitiesMeta;
  private __models: M[];
  get models() {
    return [...this.__models];
  }

  private __state: {
    records?: number,
    skip?: number,
    top?: number,
    skiptoken?: string,
    size?: number,
    page?: number,
    pages?: number
  } = {};
  get state() {
    return Object.assign({}, this.__state);
  }

  //Events
  add$ = new EventEmitter();
  remove$ = new EventEmitter();
  update$ = new EventEmitter();
  reset$ = new EventEmitter();

  constructor(values?: any[], options: { resource?: ODataResource<T>, meta?: ODataEntitiesMeta } = {}) {
    this.__resource = null;
    this.__models = [] as M[];
    if (options.resource instanceof ODataResource)
      this.attach(options.resource);
    this.populate((values || []), options.meta);
  }

  attach(resource: ODataResource<T>) {
    if (this.__resource && this.__resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this.__resource.type()}`);
    this.__resource = resource;
    return this;
  }
  get _resource() {
    return this.__resource !== null ? this.__resource.clone() as ODataResource<T> : null;
  }

  protected parse(values: any[]): M[] {
    let resource = this.__resource ? this.__resource.clone() : null;
    if (resource instanceof ODataEntitySetResource)
      resource = resource.entity();
    return (values as T[]).map(value => {
      if (resource instanceof ODataEntityResource || resource instanceof ODataNavigationPropertyResource)
        resource.segment.key(value);
      return (resource ? resource.clone().asModel(value, this.__meta !== null ? this.__meta.entity(value) : undefined) : value) as M;
    });
  }

  protected populate(values: any[], meta?: ODataEntitiesMeta): this {
    this.__meta = meta || new ODataEntitiesMeta({}, {options: this.__resource ? this.__resource.api.options : undefined});

    this.__state = {
      top: this.__meta.top || values.length,
      size: this.__meta.skip || values.length,
      skip: this.__meta.skip || values.length,
      skiptoken: this.__meta.skiptoken,
      records: this.__meta.count || values.length
    };

    if (this.__state.records !== undefined && this.__state.size !== undefined)
      this.__state.pages = Math.ceil(this.__state.records / this.__state.size);
    if (this.__state.top !== undefined && this.__state.size !== undefined)
      this.__state.page = (this.__state.top / this.__state.size) + 1;

    this.__models = this.parse(values);
    return this;
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
  fetch(options?: HttpOptions & { withCount?: boolean }): Observable<this> {
    if (this.__resource instanceof ODataEntitySetResource) {
      return this.__resource.get(options).pipe(
        map(({ entities, meta }) => this.populate(entities || [], meta)));
    } else if (this.__resource instanceof ODataNavigationPropertyResource) {
      return this.__resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities' }, options || {})).pipe(
          map(({ entities, meta }) => this.populate(entities || [], meta)));
    } else if (this.__resource instanceof ODataFunctionResource) {
      return this.__resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities' }, options || {})).pipe(
          map(({ entities, meta }) => this.populate(entities || [], meta)));
    }
    throw new Error("Not Yet!");
  }

  next(options?: HttpOptions & { withCount?: boolean }) {
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

  all(): Observable<this> {
    let obs$: Observable<any>;
    if (this.__resource instanceof ODataEntitySetResource) {
      obs$ = this.__resource.all();
    } else if (this.__resource instanceof ODataNavigationPropertyResource) {
      obs$ = this.__resource.all();
    } else {
      throw new Error("Not Yet!");
    }
    return obs$.pipe(
      map(entities => this.populate(entities)));
  }

  //TODO: add and remove like backbone
  add(model: M): Observable<this> {
    let obs$: Observable<any>;
    if (this.__resource instanceof ODataEntitySetResource) {
      obs$ = model.save();
    } else if (this.__resource instanceof ODataNavigationPropertyResource) {
      let ref = this.__resource.reference();
      obs$ = ref.add(model._resource as ODataEntityResource<T>);
    } else {
      throw new Error(`Can't add`);
    }
    return obs$.pipe(map(() => this));
  }

  remove(model: M) {
    let obs$: Observable<any>;
    if (this.__resource instanceof ODataEntitySetResource) {
      obs$ = model.destroy();
    } else if (this.__resource instanceof ODataNavigationPropertyResource) {
      let ref = this.__resource.reference();
      obs$ = ref.remove(model._resource as ODataEntityResource<T>);
    } else {
      throw new Error(`Can't remove`);
    }
    return obs$.pipe(map(() => this));
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
