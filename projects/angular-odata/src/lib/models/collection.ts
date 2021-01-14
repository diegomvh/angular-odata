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

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  protected _resource: ODataResource<T> | null;
  protected _meta: ODataEntitiesMeta | null;

  protected _models: M[];
  get models() {
    return [...this._models];
  }

  private _state: {
    records?: number,
    skip?: number,
    top?: number,
    skiptoken?: string,
    size?: number,
    page?: number,
    pages?: number
  } = {};
  get state() {
    return Object.assign({}, this._state);
  }

  constructor(values?: any[], options: { resource?: ODataResource<T>, meta?: ODataEntitiesMeta } = {}) {
    this._resource = null;
    this._meta = null;
    this._models = [];
    if (options.resource instanceof ODataResource)
      this.attach(options.resource);
    this.populate((values || []), options.meta);
  }

  attach(resource: ODataResource<T>) {
    if (this._resource && this._resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this._resource.type()}`);
    this._resource = resource;
    return this;
  }

  target() {
    return this._resource !== null ? this._resource.clone() as ODataResource<T> : null;
  }

  protected parse(values: any[]): M[] {
    let resource = this._resource ? this._resource.clone() : null;
    if (resource instanceof ODataEntitySetResource)
      resource = resource.entity();
    return (values as T[]).map(value => {
      if (resource instanceof ODataEntityResource || resource instanceof ODataNavigationPropertyResource)
        resource.segment.key(value);
      return (resource ? resource.clone().asModel(value, this._meta !== null ? this._meta.entity(value) : undefined) : value) as M;
    });
  }

  protected populate(values: any[], annots?: ODataEntitiesMeta): this {
    this._meta = annots || null;

    this._state = (annots instanceof ODataEntitiesMeta) ?
    {
      top: annots.top,
      size: annots.skip, skip: annots.skip, skiptoken: annots.skiptoken,
      records: annots.count
    } : {
      top: values.length,
      size: values.length, skip: values.length,
      records: values.length
    };

    if (this._state.records !== undefined && this._state.size !== undefined)
      this._state.pages = Math.ceil(this._state.records / this._state.size);
    if (this._state.top !== undefined && this._state.size !== undefined)
      this._state.page = (this._state.top / this._state.size) + 1;

    this._models = this.parse(values);
    return this;
  }

  toEntities() {
    return this._models.map(model => model.toEntity());
  }

  clone() {
    let options: { resource?: ODataResource<T>, meta?: ODataEntitiesMeta } = {};
    if (this._resource)
      options.resource = this._resource.clone();
    if (this._meta)
      options.meta = this._meta.clone();
    let Ctor = <typeof ODataCollection>this.constructor;
    return new Ctor(this.models, options);
  }

  // Iterable
  public [Symbol.iterator]() {
    let pointer = 0;
    let models = this._models;
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
    if (this._resource instanceof ODataEntitySetResource) {
      return this._resource.get(options).pipe(
        map(({ entities, meta }) => this.populate(entities || [], meta)));
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      return this._resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities' }, options || {})).pipe(
          map(({ entities, meta }) => this.populate(entities || [], meta)));
    } else if (this._resource instanceof ODataFunctionResource) {
      return this._resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities' }, options || {})).pipe(
          map(({ entities, meta }) => this.populate(entities || [], meta)));
    }
    throw new Error("Not Yet!");
  }

  next(options?: HttpOptions & { withCount?: boolean }) {
    if (this._state.skip) {
      this._query.skip(this._state.skip);
      return this.fetch(options);
    }
    else if (this._state.skiptoken) {
      this._query.skiptoken(this._state.skiptoken);
      return this.fetch(options);
    }
    return EMPTY;
  }

  all(): Observable<this> {
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntitySetResource) {
      obs$ = this._resource.all();
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      obs$ = this._resource.all();
    } else {
      throw new Error("Not Yet!");
    }
    return obs$.pipe(
      map(entities => this.populate(entities)));
  }

  //TODO: add and remove like backbone
  add(model: M): Observable<this> {
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntitySetResource) {
      obs$ = model.save();
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      let ref = this._resource.reference();
      obs$ = ref.add(model.target() as ODataEntityResource<T>);
    } else {
      throw new Error(`Can't add`);
    }
    return obs$.pipe(map(() => this));
  }

  remove(model: M) {
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntitySetResource) {
      obs$ = model.destroy();
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      let ref = this._resource.reference();
      obs$ = ref.remove(model.target() as ODataEntityResource<T>);
    } else {
      throw new Error(`Can't remove`);
    }
    return obs$.pipe(map(() => this));
  }

  // Count
  count() {
    return (this._resource as ODataEntitySetResource<any>).count().get();
  }

  get _config() {
    if (!this._resource)
      throw new Error(`Can't config without ODataResource`);
    return (this._resource as ODataEntitySetResource<T>).schema;
  }

  get _segment() {
    if (!this._resource)
      throw new Error(`Can't call without ODataResource`);
    return (this._resource as ODataEntitySetResource<T>).segment;
  }

  get _query() {
    if (!this._resource)
      throw new Error(`Can't query without ODataResource`);
    return (this._resource as ODataEntitySetResource<T>).query;
  }

  // Function
  protected _function<P, R>(path: string) {
    if (!this._resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    return (this._resource as ODataEntitySetResource<T>).function<P, R>(path);
  }

  // Action
  protected _action<P, R>(path: string) {
    if (!this._resource)
      throw new Error(`Can't navigationProperty without ODataResource`);
    return (this._resource as ODataEntitySetResource<T>).action<P, R>(path);
  }
}
