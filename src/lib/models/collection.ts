import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ODataEntitySetResource, Filter, Expand, GroupBy, Select, OrderBy, ODataEntityResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataEntityAnnotations, ODataPropertyAnnotations, ODataRelatedAnnotations, ODataCollectionAnnotations, ODataFunctionResource, ODataActionResource, ODataResource, ODataAnnotations } from '../resources';

import { ODataModel } from './model';

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
    }
    this._models = this._entities.map(entity => 
      (this._resource as ODataEntitySetResource<T>).entity(entity).toModel(entity, ODataEntityAnnotations.factory(entity)) as M);
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

  fetch(): Observable<this> {
    if (!this._state.page)
      this._state.page = 1;
    if (this._state.size) {
      (this._resource as ODataEntitySetResource<T> | ODataNavigationPropertyResource<T>).top(this._state.size);
      (this._resource as ODataEntitySetResource<T> | ODataNavigationPropertyResource<T>).skip(this._state.size * (this._state.page - 1));
    }
    return (this._resource as ODataEntitySetResource<T> | ODataNavigationPropertyResource<T>).get({withCount: true, responseType: 'entities'})
      .pipe(
        map(([entities, annots]) => this.populate(entities, annots)));
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

  // Custom
  protected function<R>(name: string, params: any, returnType?: string): ODataFunctionResource<R> {
    let resource = this._resource.clone() as ODataEntitySetResource<any>;
    if (resource instanceof ODataEntitySetResource) {
      var func = resource.function<R>(name, returnType);
      func.parameters(params);
      return func;
    }
  }

  protected action<R>(name: string, returnType?: string): ODataActionResource<R> {
    let resource = this._resource.clone() as ODataEntitySetResource<any>;
    if (resource instanceof ODataEntitySetResource) {
      return resource.action<R>(name, returnType);
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
