import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ODataEntitySetResource, Filter, Expand, GroupBy, Select, OrderBy, ODataResource, ODataEntitySet } from '../resources';

import { ODataModel } from './model';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';

export class ODataModelCollection<M extends ODataModel> implements Iterable<M> {
  _query: ODataEntitySetResource<any> | ODataNavigationPropertyResource<any>;
  _models: M[];
  _state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(models: M[], query: ODataEntitySetResource<any> | ODataNavigationPropertyResource<any>) {
    this._models = models;
    this._query = query;
    this.setState({
      records: this._models.length, 
      page: 1, 
      size: this._models.length
    });
  }

  private setState(state: {records?: number, page?: number, size?: number}) {
    if (state.records)
      this._state.records = state.records;
    if (state.page)
      this._state.page = state.page;
    if (state.size) {
      this._state.size = state.size;
      this._state.pages = Math.ceil(this._state.records / this._state.size);
    }
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

  assign(entitySet: ODataEntitySet<any>, query: ODataEntitySetResource<any> | ODataNavigationPropertyResource<any>) {
    let size = entitySet.skip ? entitySet.skip : entitySet.value.length;
    this.setState({records: entitySet.count, size});
    this._models = entitySet.value;
    return this;
  }

  fetch(): Observable<this> {
    let query: ODataEntitySetResource<any> | ODataNavigationPropertyResource<any> = this._query.clone<any>() as ODataEntitySetResource<any> | ODataNavigationPropertyResource<any>;
    if (!this._state.page)
      this._state.page = 1;
    if (this._state.size) {
      query.top(this._state.size);
      query.skip(this._state.size * (this._state.page - 1));
    }
    return query.get({ responseType: 'entityset', withCount: true })
      .pipe(
        map(set => set ? this.assign(set, query) : this)
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
    return (this._query as ODataEntitySetResource<any>).select(select);
  }

  filter(filter?: Filter) {
    return (this._query as ODataEntitySetResource<any>).filter(filter);
  }

  search(search?: string) {
    return (this._query as ODataEntitySetResource<any>).search(search);
  }

  orderBy(orderBy?: OrderBy) {
    return (this._query as ODataEntitySetResource<any>).orderBy(orderBy);
  }

  expand(expand?: Expand) {
    return (this._query as ODataEntitySetResource<any>).expand(expand);
  }

  groupBy(groupBy?: GroupBy) {
    return (this._query as ODataEntitySetResource<any>).groupBy(groupBy);
  }
}
