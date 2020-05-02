import { map } from 'rxjs/operators';
import { Observable, EMPTY } from 'rxjs';

import {
  ODataResource,
  ODataEntitySetResource,
  ODataEntityResource,
  ODataNavigationPropertyResource,
  ODataFunctionResource,
  ODataActionResource,
  ODataAnnotations,
  ODataEntitiesAnnotations,
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
} from '../resources/http-options';

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  protected _resource: ODataResource<T>;
  protected _annotations: ODataAnnotations;

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

  constructor(values?: any[], options: { resource?: ODataResource<T>, annotations?: ODataAnnotations } = {}) {
    if (options.resource instanceof ODataResource)
      this.attach(options.resource);
    this.populate((values || []) as M[], options.annotations || null);
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
        resource.key(value);
      return (resource ? resource.clone().toModel(value) : value) as M;
    });
  }

  protected populate(values: any[], annots?: ODataAnnotations): this {
    this._annotations = annots;

    if (annots instanceof ODataEntitiesAnnotations) {
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
    return (new Ctor(this.models, { resource: this._resource.clone(), annotations: this._annotations })) as ODataCollection<T, ODataModel<T>>;
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
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntitySetResource) {
      obs$ = this._resource.get(options);
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      obs$ = this._resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {}));
    } else if (this._resource instanceof ODataFunctionResource) {
      obs$ = this._resource.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {}));
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(
      map(([entities, annots]) => this.populate(entities, annots)));
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
      throw new Error("Not Yet!");
    return obs$.pipe(map(() => this));
  }

  remove(model: M) {
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntitySetResource) {
      obs$ = model.destroy();
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      let ref = this._resource.reference();
      obs$ = ref.remove({ target: model.target() as ODataEntityResource<T> });
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(map(() => this));
  }

  // Count
  count() {
    return (this._resource as ODataEntitySetResource<any>).count().get();
  }

  protected get _segments() {
    if (!this._resource)
      throw new Error(`Can't call without ODataResource`);
    let resource = this._resource as ODataEntitySetResource<T>;
    return {
      // Function
      function<R>(name: string, returnType?: string): ODataFunctionResource<R> { return resource.function<R>(name, returnType); },
      // Action
      action<R>(name: string, returnType?: string): ODataActionResource<R> { return resource.action<R>(name, returnType); },
    };
  }

  // Query options
  get _query() {
    if (!this._resource)
      throw new Error(`Can't query without ODataResource`);
    let resource = this._resource as ODataEntitySetResource<T>;
    return {
      // Top
      top(top?: number) { return resource.top(top); },
      // Skip
      skip(skip?: number) { return resource.skip(skip); },
      // Skiptoken
      skiptoken(skiptoken?: string) { return resource.skiptoken(skiptoken); },
      // Select
      select(select?: Select<T>) { return resource.select(select); },
      // Filter
      filter(filter?: Filter) { return resource.filter(filter); },
      // Search
      search(search?: string) { return resource.search(search); },
      // OrderBy
      orderBy(orderBy?: OrderBy<T>) { return resource.orderBy(orderBy); },
      // Expand
      expand(expand?: Expand<T>) { return resource.expand(expand); },
      // Transform
      transform(transform?: Transform<T>) { return resource.transform(transform); },
      // Alias value
      alias(name: string, value?: any) { return resource.alias(name, value); }
    };
  }
}
