import { map } from 'rxjs/operators';
import { Observable, EMPTY } from 'rxjs';

import {
  ODataResource,
  ODataEntitySetResource,
  ODataEntityResource,
  ODataNavigationPropertyResource,
  ODataFunctionResource,
  ODataActionResource,
  Filter,
  Expand,
  Select,
  OrderBy,
  Transform
} from '../resources';

import { ODataModel } from './model';
import {
  HttpOptions,
  HttpEntitiesOptions
} from '../resources/requests/options';
import { ODataEntitiesMeta } from '../resources/responses/meta';

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  protected _resource: ODataResource<T>;
  protected _meta: ODataEntitiesMeta;

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
    return this._resource.clone() as ODataResource<T>;
  }

  protected parse(values: any[]): M[] {
    let resource = this._resource ? this._resource.clone() : null;
    if (resource instanceof ODataEntitySetResource)
      resource = resource.entity();
    return (values as T[]).map(value => {
      if (resource instanceof ODataEntityResource || resource instanceof ODataNavigationPropertyResource)
        resource.segment.key(value);
      return (resource ? resource.clone().asModel(value, this._meta ? this._meta.entity(value) : null) : value) as M;
    });
  }

  protected populate(values: any[], annots?: ODataEntitiesMeta): this {
    this._meta = annots;

    if (annots instanceof ODataEntitiesMeta) {
      this._state = {}; 
      if (annots.top)
        this._state.top = annots.top;
      if (annots.skip)
        this._state.size = this._state.skip = annots.skip;
      if (annots.skiptoken)
        this._state.skiptoken = annots.skiptoken;
      if (annots.count) {
        this._state.records = annots.count;
      if (this._state.records && this._state.size)
        this._state.pages = Math.ceil(this._state.records / this._state.size);
      if (this._state.top && this._state.size)
        this._state.page = (this._state.top / this._state.size) + 1;
      }
    } else {
      this._state = {
        records: values.length, size: values.length,
        page: 1, pages: 1
      };
    }

    this._models = this.parse(values);
    return this;
  }

  toEntities() {
    return this._models.map(model => model.toEntity());
  }

  clone() {
    let Ctor = <typeof ODataCollection>this.constructor;
    return (new Ctor(this.models, { resource: this._resource.clone(), meta: this._meta })) as ODataCollection<T, ODataModel<T>>;
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
  fetch(options?: HttpOptions & {withCount?: boolean}): Observable<this> {
    if (this._resource instanceof ODataEntitySetResource) {
      return this._resource.get(options).pipe(
      map(({entities, meta}) => this.populate(entities, meta)));
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      return this._resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})).pipe(
      map(({entities, meta}) => this.populate(entities, meta)));
    } else if (this._resource instanceof ODataFunctionResource) {
      return this._resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})).pipe(
      map(({entities, meta}) => this.populate(entities, meta)));
    }
    throw new Error("Not Yet!");
  }

  next(options?: HttpOptions & {withCount?: boolean}) {
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
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(
      map(entities => this.populate(entities)));
  }

  // Mutate
  add(model: M): Observable<this> {
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntitySetResource) {
      obs$ = model.save();
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      let ref = this._resource.reference();
      obs$ = ref.add(model.target() as ODataEntityResource<T>);
    }
    if (!obs$)
      throw new Error(`Can't add`);
    return obs$.pipe(map(() => this));
  }

  remove(model: M) {
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntitySetResource) {
      obs$ = model.destroy();
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      let ref = this._resource.reference();
      obs$ = ref.remove(model.target() as ODataEntityResource<T>);
    }
    if (!obs$)
      throw new Error(`Can't remove`);
    return obs$.pipe(map(() => this));
  }

  // Count
  count() {
    return (this._resource as ODataEntitySetResource<any>).count().get();
  }

  get _config() {
    if (!this._resource)
      throw new Error(`Can't config without ODataResource`);
    return (this._resource as ODataEntitySetResource<T>).config;
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
