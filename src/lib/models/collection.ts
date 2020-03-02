import { map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { ODataEntitySetResource, Filter, Expand, GroupBy, Select, OrderBy, ODataEntityResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataEntityAnnotations, ODataPropertyAnnotations, ODataRelatedAnnotations, ODataCollectionAnnotations, ODataFunctionResource, ODataActionResource, ODataResource, ODataAnnotations } from '../resources';

import { ODataModel } from './model';
import { HttpHeaders, HttpParams } from '@angular/common/http';

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  _resource: ODataResource<T>;
  _entities: T[];
  _models: M[];
  _annotations: ODataAnnotations | null;
  _state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

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
    this._entities = entities;
    this._annotations = annots;
    if (annots instanceof ODataCollectionAnnotations) {
      if (annots.skip && annots.count) {
        this._state.records = annots.count;
        this._state.size = annots.skip;
        this._state.pages = Math.ceil(annots.count / annots.skip);
      };
    } else {
      this._state.records = entities.length;
      this._state.size = entities.length;
      this._state.pages = 1;
    }
    const entityMapper = (entity) => {
      if (this._resource instanceof ODataEntitySetResource) {
        return this._resource.entity(entity, annots).toModel(entity, ODataEntityAnnotations.factory(entity)) as M;
      } else if (this._resource instanceof ODataFunctionResource) {
        return this._resource.entity(entity, annots).toModel(entity, ODataEntityAnnotations.factory(entity)) as M;
      } else if (this._resource instanceof ODataNavigationPropertyResource) {
        return this._resource.entity(entity, annots).toModel(entity, ODataEntityAnnotations.factory(entity)) as M;
      } else if (this._resource instanceof ODataPropertyResource) {
        return this._resource.entity(entity, annots).toModel(entity, ODataEntityAnnotations.factory(entity)) as M;
      }
    }
    this._models = entities.map(entityMapper);
    return this;
  }

  toEntities() {
    return this._models.map(model => model.toEntity());
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
  fetch(): Observable<this> {
    let obs$: Observable<any>;
    if (!this._state.page)
      this._state.page = 1;
    if (this._resource instanceof ODataEntitySetResource) {
      if (this._state.size) {
        this._resource.top(this._state.size);
        this._resource.skip(this._state.size * (this._state.page - 1));
      }
      obs$ = this._resource.get({ withCount: true });
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      if (this._state.size) {
        this._resource.top(this._state.size);
        this._resource.skip(this._state.size * (this._state.page - 1));
      }
      obs$ = this._resource.get({ withCount: true, responseType: 'entities' });
    } else if (this._resource instanceof ODataFunctionResource) {
      obs$ = this._resource.get({ responseType: 'entities' });
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

  add(model: M): Observable<this> { 
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntitySetResource) {
      obs$ = model.save();
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      let ref = this._resource.reference();
      obs$ = ref.add(model._resource as ODataEntityResource<T>);
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
      obs$ = ref.remove({ target: model._resource as ODataEntityResource<T> });
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(map(() => this));
  }

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

  count() {
    return (this._resource as ODataEntitySetResource<any>).count().get();
  }

  // Functions
  protected function<R>(name: string, params: any, returnType?: string): ODataFunctionResource<R> {
    if (this._resource instanceof ODataEntitySetResource) {
      var func = this._resource.function<R>(name, returnType);
      func.parameters(params);
      return func;
    }
    throw new Error(`Can't function without EntitySetResource`);
  }

  protected callFunction<R>(name: string, params: any | null, 
    responseType: 'value' | 'model' | 'collection', 
    returnType?: string, options?: {
      headers?: HttpHeaders | {[header: string]: string | string[]},
      params?: HttpParams|{[param: string]: string | string[]},
      reportProgress?: boolean,
      withCredentials?: boolean,
      withCount?: boolean
    }): Observable<any> {
      let ops = <any>{
        headers: options && options.headers,
        params: options && options.params,
        responseType: responseType === 'value' ? 'property' : 
          responseType === 'model' ? 'entity' : 'entities',
        reportProgress: options && options.reportProgress,
        withCredentials: options && options.withCredentials,
        withCount: options && options.withCount
      }
      let res = this.function<R>(name, params, returnType);
      let res$ = res.get(ops) as Observable<any>;
      switch (responseType) {
        case 'value':
          return (res$ as Observable<[R, ODataPropertyAnnotations]>).pipe(map(([value, ]) => value));
        case 'model':
          return (res$ as Observable<[R, ODataEntityAnnotations]>).pipe(map(([entity, annots]) => res.toModel<ODataModel<R>>(entity, annots)));
        case 'collection':
          return (res$ as Observable<[R[], ODataCollectionAnnotations]>).pipe(map(([entities, annots]) => res.toCollection<ODataCollection<R, ODataModel<R>>>(entities, annots)));
      }
  }

  // Actions
  protected action<R>(name: string, returnType?: string): ODataActionResource<R> {
    if (this._resource instanceof ODataEntitySetResource) {
      return this._resource.action<R>(name, returnType);
    }
    throw new Error(`Can't action without EntitySetResource`);
  }

  protected callAction<R>(name: string, body: any | null, 
    responseType: 'value' | 'model' | 'collection', 
    returnType?: string, options?: {
      headers?: HttpHeaders | {[header: string]: string | string[]},
      params?: HttpParams|{[param: string]: string | string[]},
      reportProgress?: boolean,
      withCredentials?: boolean,
      withCount?: boolean
    }): Observable<any> {
      let ops = <any>{
        headers: options && options.headers,
        params: options && options.params,
        responseType: responseType === 'value' ? 'property' : 
          responseType === 'model' ? 'entity' : 'entities',
        reportProgress: options && options.reportProgress,
        withCredentials: options && options.withCredentials,
        withCount: options && options.withCount
      }
      let res = this.action<R>(name, returnType);
      let res$ = res.post(body, ops) as Observable<any>;
      switch (responseType) {
        case 'value':
          return (res$ as Observable<[R, ODataPropertyAnnotations]>).pipe(map(([value, ]) => value));
        case 'model':
          return (res$ as Observable<[R, ODataEntityAnnotations]>).pipe(map(([entity, annots]) => res.toModel<ODataModel<R>>(entity, annots)));
        case 'collection':
          return (res$ as Observable<[R[], ODataCollectionAnnotations]>).pipe(map(([entities, annots]) => res.toCollection<ODataCollection<R, ODataModel<R>>>(entities, annots)));
      }
  }

  // Mutate query
  select(select?: Select<T>) {
    return (this._resource as ODataEntitySetResource<T>).select(select);
  }

  filter(filter?: Filter) {
    return (this._resource as ODataEntitySetResource<T>).filter(filter);
  }

  search(search?: string) {
    return (this._resource as ODataEntitySetResource<T>).search(search);
  }

  orderBy(orderBy?: OrderBy<T>) {
    return (this._resource as ODataEntitySetResource<T>).orderBy(orderBy);
  }

  expand(expand?: Expand<T>) {
    return (this._resource as ODataEntitySetResource<T>).expand(expand);
  }

  groupBy(groupBy?: GroupBy<T>) {
    return (this._resource as ODataEntitySetResource<T>).groupBy(groupBy);
  }
}
