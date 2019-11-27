import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ODataEntitySetResource, Filter, Expand, GroupBy, Select, OrderBy, ODataResource, ODataAnnotations, ODataCollectionAnnotations } from '../resources';

import { ODataModel } from './model';

export class ODataModelCollection<M extends ODataModel> implements Iterable<M> {
  _resource: ODataResource<any> | null;
  _models: M[];
  _state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(models: M[]) {
    this._models = models;
  }

  private setState(state: {records?: number, page?: number, size?: number, pages?: number}) {
    if (state.records)
      this._state.records = state.records;
    if (state.page)
      this._state.page = state.page;
    if (state.size)
      this._state.size = state.size;
    if (state.pages)
      this._state.pages = state.pages;
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

  assign(models: M[], col: ODataCollectionAnnotations) {
    this.setState({records: col.count, size: col.skip});
    this._models = models;
    return this;
  }

  attach(query: ODataResource<any>){
    this._resource = query;
  }

  fetch(): Observable<this> {
    let query: ODataEntitySetResource<any> = this._resource.clone<any>() as ODataEntitySetResource<any>;
    if (!this._state.page)
      this._state.page = 1;
    if (this._state.size) {
      query.top(this._state.size);
      query.skip(this._state.size * (this._state.page - 1));
    }
    return query.get()
      .pipe(
        map(([models, col]) => models ? this.assign(models, col) : this)
      );
  }

  page(page: number) {
    this._state.page = page;
    return this.fetch();
  }

  size(size: number) {
    this.setState({size});
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
