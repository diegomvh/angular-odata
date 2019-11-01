import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ODataEntitySetResource, Filter, Expand, GroupBy, Select, OrderBy, ODataResource, ODataEntitySet } from '../resources';

import { ODataModel } from './model';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';

export class ODataModelCollection<M extends ODataModel> implements Iterable<M> {
  query: ODataEntitySetResource<any> | ODataNavigationPropertyResource<any>;
  models: M[];

  state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(models: M[], query: ODataEntitySetResource<any> | ODataNavigationPropertyResource<any>) {
    this.models = models;
    this.query = query;
    this.setState({
      records: this.models.length, 
      page: 1, 
      size: this.models.length
    });
  }

  private setState(state: {records?: number, page?: number, size?: number}) {
    if (state.records)
      this.state.records = state.records;
    if (state.page)
      this.state.page = state.page;
    if (state.size) {
      this.state.size = state.size;
      this.state.pages = Math.ceil(this.state.records / this.state.size);
    }
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

  assign(entitySet: ODataEntitySet<any>, query: ODataEntitySetResource<any> | ODataNavigationPropertyResource<any>) {
    let size = entitySet.skip ? entitySet.skip : entitySet.value.length;
    this.setState({records: entitySet.count, size});
    this.models = entitySet.value;
    return this;
  }

  fetch(): Observable<this> {
    let query: ODataEntitySetResource<any> | ODataNavigationPropertyResource<any> = this.query.clone<any>() as ODataEntitySetResource<any> | ODataNavigationPropertyResource<any>;
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

  page(page: number) {
    this.state.page = page;
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
    return (this.state.page) ? this.page(this.state.page - 1) : this.fetch();
  }

  nextPage() {
    return (this.state.page) ? this.page(this.state.page + 1) : this.fetch();
  }

  lastPage() {
    return (this.state.pages) ? this.page(this.state.pages) : this.fetch();
  }

  // Mutate query
  select(select?: Select) {
    return (this.query as ODataEntitySetResource<any>).select(select);
  }

  filter(filter?: Filter) {
    return (this.query as ODataEntitySetResource<any>).filter(filter);
  }

  search(search?: string) {
    return (this.query as ODataEntitySetResource<any>).search(search);
  }

  orderBy(orderBy?: OrderBy) {
    return (this.query as ODataEntitySetResource<any>).orderBy(orderBy);
  }

  expand(expand?: Expand) {
    return (this.query as ODataEntitySetResource<any>).expand(expand);
  }

  groupBy(groupBy?: GroupBy) {
    return (this.query as ODataEntitySetResource<any>).groupBy(groupBy);
  }
}
