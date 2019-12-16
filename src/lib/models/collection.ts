import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ODataEntitySetResource, Filter, Expand, GroupBy, Select, OrderBy, ODataEntityResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataEntityAnnotations, ODataPropertyAnnotations, ODataRelatedAnnotations, ODataCollectionAnnotations, ODataFunctionResource, ODataActionResource, ODataResource, ODataAnnotations } from '../resources';

import { ODataModel } from './model';
import { Parser } from './parser';
import { ODataClient } from '../client';

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  _client: ODataClient; 
  _resource: ODataResource<any>;
  _annotations: ODataAnnotations;
  _models: M[];
  _state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(models?: M[]) {
    this._models = models || [];
  }

  attach(entities: T[], resource?: ODataResource<T>, annots?: ODataAnnotations): this {
    this._resource = resource;
    this._annotations = annots;
    if (annots instanceof ODataCollectionAnnotations) {
      if (annots.skip && annots.count) {
        this._state.records = annots.count;
        this._state.size = annots.skip;
        this._state.pages = Math.ceil(annots.count / annots.skip);
      };
    }
    if (this._resource) {
      this._models = entities.map(model => 
        (this._resource as ODataEntitySetResource<any>).entity(model).toModel(model, ODataEntityAnnotations.factory(model)) as M);
    } else {
      this._models = entities.map(e => <any>e as M);
    }
    return this;
  }

  toJSON() {
    return this._models.map(model => model.toJSON());
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
    let resource = this._resource.clone() as ODataEntitySetResource<any> | ODataNavigationPropertyResource<any>;
    if (!this._state.page)
      this._state.page = 1;
    if (this._state.size) {
      resource.top(this._state.size);
      resource.skip(this._state.size * (this._state.page - 1));
    }
    return resource.get({withCount: true, responseType: 'entities'})
      .pipe(
        map(([entities, annots]) => this.attach(entities, resource, annots)));
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
    if (this._resource instanceof ODataEntitySetResource) {
      let parser = returnType? this._client.parserForType<R>(returnType) as Parser<R> : null;
      let func = this._resource.function<R>(name, parser);
      func.parameters(params);
      return func;
    }
  }

  protected action<R>(name: string, returnType?: string): ODataActionResource<R> {
    if (this._resource instanceof ODataEntitySetResource) {
      let parser = returnType? this._client.parserForType<R>(returnType) as Parser<R> : null;
      let action = this._resource.action<R>(name, parser);
      return action;
    }
  }

  // Mutate query
  select(select?: Select) {
    return (this._resource as ODataEntitySetResource<any>).select(select);
  }

  filter(filter?: Filter) {
    return (this._resource as ODataEntitySetResource<any>).filter(filter);
  }

  search(search?: string) {
    return (this._resource as ODataEntitySetResource<any>).search(search);
  }

  orderBy(orderBy?: OrderBy) {
    return (this._resource as ODataEntitySetResource<any>).orderBy(orderBy);
  }

  expand(expand?: Expand) {
    return (this._resource as ODataEntitySetResource<any>).expand(expand);
  }

  groupBy(groupBy?: GroupBy) {
    return (this._resource as ODataEntitySetResource<any>).groupBy(groupBy);
  }
}
