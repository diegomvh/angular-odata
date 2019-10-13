import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ODataEntitySet } from '../odata-response';
import { ODataEntitySetRequest, PlainObject, Filter, Expand, GroupBy, Select, OrderBy, ODataRequest } from '../odata-request';

import { Model } from './model';
import { ODataNavigationPropertyRequest } from '../odata-request/requests/navigationproperty';

export class ModelCollection<M extends Model> implements Iterable<M> {
  static model: typeof Model = null;
  query: ODataRequest;
  models: M[];

  state: {
    page?: number,
    pages?: number,
    size?: number,
    records?: number,
  };

  constructor(models: PlainObject[], query: ODataRequest) {
    this.models = this.parse(models, query);
    this.state = {
      records: this.models.length
    };
  }

  parse(models: PlainObject[], query: ODataRequest) {
    this.query = query
    let Ctor = <typeof ModelCollection>this.constructor;
    return models.map(model => new Ctor.model(model, this.query.clone()) as M);
  }

  toJSON() {
    return this.models.map(model => model.toJSON());
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

  assign(entitySet: ODataEntitySet<Model>, query: ODataRequest) {
    this.state.records = entitySet.count;
    let skip = entitySet.skip;
    if (skip)
      this.state.size = skip;
    if (this.state.size)
      this.state.pages = Math.ceil(this.state.records / this.state.size);
    this.models = this.parse(entitySet.entities, (query as ODataEntitySetRequest<Model>).entity());
    return this;
  }

  fetch(): Observable<this> {
    let query: ODataEntitySetRequest<Model> | ODataNavigationPropertyRequest<Model> = this.query.clone();
    if (!this.state.page)
      this.state.page = 1;
    if (this.state.size) {
      query.top(this.state.size);
      query.skip(this.state.size * (this.state.page - 1));
    }
    return query.get({ responseType: 'entityset', withCount: true })
      .pipe(
        map(set => set ? this.assign(set, query) : this)
      );
  }

  getPage(page: number) {
    this.state.page = page;
    return this.fetch();
  }

  getFirstPage() {
    return this.getPage(1);
  }

  getPreviousPage() {
    return (this.state.page) ? this.getPage(this.state.page - 1) : this.fetch();
  }

  getNextPage() {
    return (this.state.page) ? this.getPage(this.state.page + 1) : this.fetch();
  }

  getLastPage() {
    return (this.state.pages) ? this.getPage(this.state.pages) : this.fetch();
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
    return (this.query as ODataEntitySetRequest<Model>).select(select);
  }

  filter(filter?: Filter) {
    return (this.query as ODataEntitySetRequest<Model>).filter(filter);
  }

  search(search?: string) {
    return (this.query as ODataEntitySetRequest<Model>).search(search);
  }

  orderBy(orderBy?: OrderBy) {
    return (this.query as ODataEntitySetRequest<Model>).orderBy(orderBy);
  }

  expand(expand?: Expand) {
    return (this.query as ODataEntitySetRequest<Model>).expand(expand);
  }

  groupBy(groupBy?: GroupBy) {
    return (this.query as ODataEntitySetRequest<Model>).groupBy(groupBy);
  }
}
