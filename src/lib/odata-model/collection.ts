import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ODataEntitySet } from '../odata-response';
import { ODataEntitySetRequest, PlainObject, Filter, Expand, GroupBy, Select, OrderBy } from '../odata-request';

import { ODataModel, Model } from './model';
import { ODataModelService } from '../odata-service';

export class Collection<M extends Model> {
  static set: string = "";
  static type: string = "";
  static modelType: string = "";
  static service: ODataModelService = null;
  static query: ODataEntitySetRequest<Model> = null;
  query: ODataEntitySetRequest<M>;
  models: M[];
  state: {
    page?: number,
    pages?: number,
    size?: number,
    records?: number,
  };

  constructor(models: PlainObject[], query?: ODataEntitySetRequest<M>) {
    let ctor = <typeof Model>this.constructor;
    this.query = query || ctor.query.clone();
    this.state = {
      records: this.models.length
    };
    this.models = this.parse(models);
  }

  parse(models: PlainObject[]) {
    let ctor = <typeof Collection>this.constructor;
    let service = ctor.service;
    let klass = service.model(ctor.modelType)
    return models.map(model => new klass(model) as M);
  }

  toJSON() {
    return this.models.map(model => model.toJSON());
  }

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
}

export class ODataCollection<M extends ODataModel> extends Collection<M> {
  assign(entitySet: ODataEntitySet<ODataModel>) {
    this.state.records = entitySet.count;
    let skip = entitySet.skip;
    if (skip)
      this.state.size = skip;
    if (this.state.size)
      this.state.pages = Math.ceil(this.state.records / this.state.size);
    this.models = this.parse(entitySet.entities);
    return this;
  }

  fetch(options?: any): Observable<this> {
    let query = this.query.clone() as ODataEntitySetRequest<M>;
    if (!this.state.page)
      this.state.page = 1;
    if (this.state.size) {
      query.top(this.state.size);
      query.skip(this.state.size * (this.state.page - 1));
    }
    return query.get()
      .pipe(
        map(set => this.assign(set))
      );
  }

  getPage(page: number, options?: any) {
    this.state.page = page;
    return this.fetch(options);
  }

  getFirstPage(options?: any) {
    return this.getPage(1, options);
  }

  getPreviousPage(options?: any) {
    return (this.state.page) ? this.getPage(this.state.page - 1, options) : this.fetch(options);
  }

  getNextPage(options?: any) {
    return (this.state.page) ? this.getPage(this.state.page + 1, options) : this.fetch(options);
  }

  getLastPage(options?: any) {
    return (this.state.pages) ? this.getPage(this.state.pages, options) : this.fetch(options);
  }

  setPageSize(size: number) {
    this.state.size = size;
    if (this.state.records) {
      this.state.pages = Math.ceil(this.state.records / this.state.size);
      if (this.state.page > this.state.pages)
        this.state.page = this.state.pages;
    }
  }

  // Mutate query
  select(select?: Select) {
    return this.query.select(select);
  }

  filter(filter?: Filter) {
    return this.query.filter(filter);
  }

  search(search?: string) {
    return this.query.search(search);
  }

  orderBy(orderBy?: OrderBy) {
    return this.query.orderBy(orderBy);
  }

  expand(expand?: Expand) {
    return this.query.expand(expand);
  }

  groupBy(groupBy?: GroupBy) {
    return this.query.groupBy(groupBy);
  }
}
