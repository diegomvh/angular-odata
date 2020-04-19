import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

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
  GroupBy,
  Select,
  OrderBy
} from '../resources';

import { ODataModel } from './model';
import {
  HttpOptions,
  HttpEntitiesOptions
} from '../resources/http-options';
import { ODataCallableResource } from '../resources/requests/callable';

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  private _resource: ODataResource<T>;
  private _annotations: ODataAnnotations;

  private _models: M[];
  get models() {
    return [...this._models];
  }

  private _state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};
  get state() {
    return Object.assign({}, this._state);
  }
  private resetState() {
    this._state = {};
  }

  constructor(values?: any[], options: {resource?: ODataResource<T>, annotations?: ODataAnnotations} = {}) {
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

  protected populate(values: any[], annots?: ODataAnnotations): this {
    this._annotations = annots;

    this._state.records = (annots instanceof ODataEntitiesAnnotations && annots.count) ? annots.count : values.length;
    this._state.size = (annots instanceof ODataEntitiesAnnotations && annots.skip) ? annots.skip : values.length;
    this._state.pages = (this._state.records && this._state.size) ? Math.ceil(this._state.records / this._state.size) : 1;
    this._models = this._resource ? (values as T[]).map(value => this._resource.toModel(value) as M) : values as M[];
    return this;
  }

  toEntities() {
    return this._models.map(model => model.toEntity());
  }

  clone() {
    let Ctor = <typeof ODataCollection>this.constructor;
    return (new Ctor(this.models, {resource: this._resource.clone(), annotations:this._annotations})) as ODataCollection<T, ODataModel<T>>;
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
  fetch(options?: HttpOptions): Observable<this> {
    let opts = <HttpEntitiesOptions>{
      headers: options && options.headers,
      params: options && options.params,
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }
    let obs$: Observable<any>;
    if (!this._state.page)
      this._state.page = 1;
    if (this._resource instanceof ODataEntitySetResource) {
      if (this._state.size) {
        this._resource.top(this._state.size);
        this._resource.skip(this._state.size * (this._state.page - 1));
      }
      obs$ = this._resource.get(Object.assign(opts, { withCount: true }));
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      if (this._state.size) {
        this._resource.top(this._state.size);
        this._resource.skip(this._state.size * (this._state.page - 1));
      }
      obs$ = this._resource.get(Object.assign(opts, { withCount: true, responseType: 'entities' }));
    } else if (this._resource instanceof ODataFunctionResource) {
      obs$ = this._resource.get(Object.assign(opts, { responseType: 'entities' }));
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(
      map(([entities, annots]) => this.populate(entities, annots)));
  }

  all(): Observable<this> {
    let obs$: Observable<any>;
    if (!this._state.page)
      this._state.page = 1;
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

  // Pagination
  page(page: number) {
    this._state.page = page;
    return this.fetch();
  }

  size(size: number) {
    this._state.size = size;
    return this.page(1);
  }

  firstPage() {
    return this.page(1);
  }

  previousPage() {
    return (this._state.page) ? this.page(this._state.page - 1) : this.fetch();
  }

  nextPage() {
    return (this._state.page) ? this.page(this._state.page + 1) : this.fetch();
  }

  lastPage() {
    return (this._state.pages) ? this.page(this._state.pages) : this.fetch();
  }

  // Count
  count() {
    return (this._resource as ODataEntitySetResource<any>).count().get();
  }

  // Callable
  protected call<R>(
    callable: ODataCallableResource<R>,
    args: any | null,
    responseType: 'value',
    options?: HttpOptions
  ): Observable<R>;

  protected call<R, M extends ODataModel<R>>(
    callable: ODataCallableResource<R>,
    args: any | null,
    responseType: 'model',
    options?: HttpOptions
  ): Observable<M>;

  protected call<R, M extends ODataModel<R>, C extends ODataCollection<R, M>>(
    callable: ODataCallableResource<R>,
    args: any | null,
    responseType: 'collection',
    options?: HttpOptions
  ): Observable<C>;

  protected call<R>(
    callable: ODataCallableResource<R>,
    args: any | null,
    responseType: 'value' | 'model' | 'collection',
    options?: HttpOptions
  ): Observable<any> {
    let res$ = callable.call(args, 'json', options);
    switch (responseType) {
      case 'value':
        return res$.pipe(map((body: any) => callable.toValue(body)[0]));
      case 'model':
        return res$.pipe(map((body: any) => callable.toModel<ODataModel<any>>(body)));
      case 'collection':
        return res$.pipe(map((body: any) => callable.toCollection<ODataCollection<any, ODataModel<any>>>(body)));
    }
  }

  // Functions
  protected function<R>(name: string, returnType?: string): ODataFunctionResource<R> {
    if (this._resource instanceof ODataEntitySetResource) {
      return this._resource.function<R>(name, returnType);
    }
    throw new Error(`Can't function without EntitySetResource`);
  }

  // Actions
  protected action<R>(name: string, returnType?: string): ODataActionResource<R> {
    if (this._resource instanceof ODataEntitySetResource) {
      return this._resource.action<R>(name, returnType);
    }
    throw new Error(`Can't action without EntitySetResource`);
  }

  // Query options
  get _query() {
    let resource = this._resource as ODataEntitySetResource<T>;
    let col = this;
    return {
      select(select?: Select<T>) { 
        return resource.select(select); 
      },
      filter(filter?: Filter) { 
        col.resetState();
        return resource.filter(filter); 
      },
      search(search?: string) { 
        col.resetState();
        return resource.search(search); 
      },
      orderBy(orderBy?: OrderBy<T>) { 
        col.resetState();
        return resource.orderBy(orderBy); 
      },
      expand(expand?: Expand<T>) { 
        return resource.expand(expand); 
      },
      groupBy(groupBy?: GroupBy<T>) { 
        col.resetState();
        return resource.groupBy(groupBy); 
      },
      alias(name: string, value?: any) {
        return resource.alias(name, value);
      }
    }
  }
}
