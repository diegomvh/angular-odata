import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ODataEntitySetResource, Filter, Expand, GroupBy, Select, OrderBy, ODataResource, ODataAnnotations, ODataCollectionAnnotations, ODataEntityResource, ODataNavigationPropertyResource, ODataPropertyResource } from '../resources';

import { ODataModel } from './model';
import { ODataSettings } from './settings';

export class ODataModelCollection<M extends ODataModel> implements Iterable<M> {
  _settings: ODataSettings; 
  _resource: ODataEntitySetResource<any> | ODataPropertyResource<any> | ODataNavigationPropertyResource<any>;
  _models: M[];
  _state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(models: M[] | null, resource: ODataEntitySetResource<any> | ODataPropertyResource<any> | ODataNavigationPropertyResource<any>, settings: ODataSettings) {
    this._settings = settings;
    this.assign(models || [], resource);
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

  private assign(models: any[], resource: ODataEntitySetResource<any> | ODataPropertyResource<any> | ODataNavigationPropertyResource<any>) {
    this._resource = resource;
    let Klass = this._settings.modelForType(this._resource.type());
    this._models = models.map(model => new Klass(model, this._resource.entity(model), this._settings) as M);
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
    return resource.get({withCount: true, responseType: 'entityset'})
      .pipe(
        map(([models, col]) => {
          this.setState({records: col.count, size: col.skip});
          this.assign(models, resource);
          return this;
        }));
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
