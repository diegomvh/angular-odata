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
  private _annotations: ODataAnnotations | null;
  private _models: M[];
  private _state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};
  private resetState() {
    this._state = {};
  }

  constructor(resource: ODataResource<T>, entities?: Partial<T>[], annots?: ODataAnnotations) {
    this._resource = resource;
    this.populate((entities || []) as T[], annots || null);
  }

  attach(resource: ODataResource<T>) {
    if (this._resource && this._resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this._resource.type()}`);
    this._resource = resource;
    return this;
  }

  private populate(entities: T[], annots?: ODataAnnotations): this {
    this._annotations = annots;

    this._state.records = (annots instanceof ODataEntitiesAnnotations && annots.count) ? annots.count : entities.length;
    this._state.size = (annots instanceof ODataEntitiesAnnotations && annots.skip) ? annots.skip : entities.length;
    this._state.pages = (this._state.records && this._state.size) ? Math.ceil(this._state.records / this._state.size) : 1;
    this._models = entities.map(value => this._resource.toModel(value) as M);
    return this;
  }

  toEntities() {
    return this._models.map(model => model.toEntity());
  }

  clone() {
    let Ctor = <typeof ODataCollection>this.constructor;
    return (new Ctor(this._resource.clone(), this.toEntities(), this._annotations)) as ODataCollection<T, ODataModel<T>>;
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

  // Array like
  filter(predicate: (m: M) => boolean): M[] {
    return this._models.filter(predicate);
  }

  map(predicate: (m: M) => any) {
    return this._models.map(predicate);
  }

  at(index: number): M {
    return this._models[index >= 0 ? index : this._models.length - index];
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
    }
  }
}
