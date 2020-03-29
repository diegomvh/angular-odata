import { map } from 'rxjs/operators';
import { Observable, of, NEVER } from 'rxjs';

import { ODataEntitySetResource, Filter, Expand, GroupBy, Select, OrderBy, ODataEntityResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataEntityAnnotations, ODataPropertyAnnotations, ODataRelatedAnnotations, ODataEntitiesAnnotations, ODataFunctionResource, ODataActionResource, ODataResource, ODataAnnotations, ODataToEntityResource } from '../resources';

import { ODataModel } from './model';
import { HttpOptions, HttpEntitiesOptions } from '../resources/http-options';
import { entityAttributes, odataAnnotations } from '../types';
import { ODataCallableResource } from '../resources/requests/callable';

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  private resource: ODataResource<T>;
  private entities: T[];
  private annotations: ODataAnnotations | null;
  private models: M[];
  private state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(resource: ODataResource<T>, entities?: Partial<T>[], annots?: ODataAnnotations) {
    this.resource = resource;
    this.populate((entities || []) as T[], annots || null);
  }

  attach(resource: ODataResource<T>) {
    if (this.resource && this.resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this.resource.type()}`);
    this.resource = resource;
    return this;
  }

  private populate(entities: T[], annots?: ODataAnnotations): this {
    this.entities = entities;
    this.annotations = annots;

    this.state.records = (annots instanceof ODataEntitiesAnnotations && annots.count) ? annots.count : entities.length;
    this.state.size = (annots instanceof ODataEntitiesAnnotations && annots.skip) ? annots.skip : entities.length;
    this.state.pages = (this.state.records && this.state.size) ? Math.ceil(this.state.records / this.state.size) : 1;
    const entityMapper = (value) => {
      let entity = entityAttributes(value);
      let eannots = ODataEntityAnnotations.factory(odataAnnotations(value));
      if ("entity" in this.resource) {
        let res = this.resource as ODataToEntityResource<T>;
        return res.entity(value, annots).toModel(entity, eannots) as M;
      }
    }
    this.models = entities.map(entityMapper);
    return this;
  }

  toEntities() {
    return this.models.map(model => model.toEntity());
  }

  clone() {
    let Ctor = <typeof ODataCollection>this.constructor;
    return (new Ctor(this.resource.clone(), this.toEntities(), this.annotations)) as ODataCollection<T, ODataModel<T>>;
  }

  // Iterable
  public [Symbol.iterator]() {
    let pointer = 0;
    let models = this.models;
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
    if (!this.state.page)
      this.state.page = 1;
    if (this.resource instanceof ODataEntitySetResource) {
      if (this.state.size) {
        this.resource.top(this.state.size);
        this.resource.skip(this.state.size * (this.state.page - 1));
      }
      obs$ = this.resource.get(Object.assign(opts, { withCount: true }));
    } else if (this.resource instanceof ODataNavigationPropertyResource) {
      if (this.state.size) {
        this.resource.top(this.state.size);
        this.resource.skip(this.state.size * (this.state.page - 1));
      }
      obs$ = this.resource.get(Object.assign(opts, { withCount: true, responseType: 'entities' }));
    } else if (this.resource instanceof ODataFunctionResource) {
      obs$ = this.resource.get(Object.assign(opts, { responseType: 'entities' }));
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(
      map(([entities, annots]) => this.populate(entities, annots)));
  }

  all(): Observable<this> {
    let obs$: Observable<any>;
    if (!this.state.page)
      this.state.page = 1;
    if (this.resource instanceof ODataEntitySetResource) {
      obs$ = this.resource.all();
    } else if (this.resource instanceof ODataNavigationPropertyResource) {
      obs$ = this.resource.all();
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(
      map(entities => this.populate(entities)));
  }

  // Mutate
  add(model: M): Observable<this> {
    let obs$: Observable<any>;
    if (this.resource instanceof ODataEntitySetResource) {
      obs$ = model.save();
    } else if (this.resource instanceof ODataNavigationPropertyResource) {
      let ref = this.resource.reference();
      obs$ = ref.add(model.target() as ODataEntityResource<T>);
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(map(() => this));
  }

  remove(model: M) {
    let obs$: Observable<any>;
    if (this.resource instanceof ODataEntitySetResource) {
      obs$ = model.destroy();
    } else if (this.resource instanceof ODataNavigationPropertyResource) {
      let ref = this.resource.reference();
      obs$ = ref.remove({ target: model.target() as ODataEntityResource<T> });
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(map(() => this));
  }

  // Pagination
  page(page: number) {
    this.state.page = page;
    return this.fetch();
  }

  size(size: number) {
    this.state.size = size;
    return this.page(1);
  }

  firstPage() {
    return this.page(1);
  }

  previousPage() {
    return (this.state.page) ? this.page(this.state.page - 1) : this.fetch();
  }

  nextPage() {
    return (this.state.page) ? this.page(this.state.page + 1) : this.fetch();
  }

  lastPage() {
    return (this.state.pages) ? this.page(this.state.pages) : this.fetch();
  }

  // Count
  count() {
    return (this.resource as ODataEntitySetResource<any>).count().get();
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

  protected call(
    callable: ODataCallableResource<any>, 
    args: any | null, 
    responseType: 'value' | 'model' | 'collection', 
    options?: HttpOptions
  ): Observable<any> {
    let ops = <any>{
      headers: options && options.headers,
      params: options && options.params,
      responseType: responseType === 'value' ? 'property' : 
        responseType === 'model' ? 'entity' : 'entities',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials,
      withCount: responseType === 'collection' 
    }
    let res$: Observable<any> = NEVER;
    if (callable instanceof ODataFunctionResource) {
      if (args)
        callable.parameters(args);
      res$ = callable.get(ops) as Observable<any>;
    } else if (callable instanceof ODataActionResource) {
      res$ = callable.post(args, ops) as Observable<any>;
    } else {
      throw new Error(`Can't call resource`);
    }
    switch (responseType) {
      case 'value':
        return (res$ as Observable<[any, ODataPropertyAnnotations]>).pipe(map(([value, ]) => value));
      case 'model':
        return (res$ as Observable<[any, ODataEntityAnnotations]>).pipe(map(([entity, annots]) => callable.toModel<ODataModel<any>>(entity, annots)));
      case 'collection':
        return (res$ as Observable<[any[], ODataEntitiesAnnotations]>).pipe(map(([entities, annots]) => callable.toCollection<ODataCollection<any, ODataModel<any>>>(entities, annots)));
    }
  }

  // Functions
  protected function<R>(name: string, returnType?: string): ODataFunctionResource<R> {
    if (this.resource instanceof ODataEntitySetResource) {
      return this.resource.function<R>(name, returnType);
    }
    throw new Error(`Can't function without EntitySetResource`);
  }

  // Actions
  protected action<R>(name: string, returnType?: string): ODataActionResource<R> {
    if (this.resource instanceof ODataEntitySetResource) {
      return this.resource.action<R>(name, returnType);
    }
    throw new Error(`Can't action without EntitySetResource`);
  }

  // Array like
  filter(predicate: (m: M) => boolean): M[] {
    return this.models.filter(predicate);
  }

  map(predicate: (m: M) => any) {
    return this.models.map(predicate);
  }

  at(index: number): M {
    return this.models[index >= 0 ? index : this.models.length - index];
  }

  // Query options
  get _query() {
    let resource = this.resource as ODataEntitySetResource<T>;
    return {
      select(select?: Select<T>) { return resource.select(select); },
      filter(filter?: Filter) { return resource.filter(filter); },
      search(search?: string) { return resource.search(search); },
      orderBy(orderBy?: OrderBy<T>) { return resource.orderBy(orderBy); },
      expand(expand?: Expand<T>) { return resource.expand(expand); },
      groupBy(groupBy?: GroupBy<T>) { return resource.groupBy(groupBy); },
    }
  }
}
