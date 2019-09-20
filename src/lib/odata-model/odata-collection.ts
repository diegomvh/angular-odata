import { ODataModel, Model } from './odata-model';
import { map } from 'rxjs/operators';
import { ODataQueryBuilder, Filter, Expand, GroupBy, PlainObject } from '../odata-query/odata-query-builder';
import { Observable } from 'rxjs';
import { ODataSet } from '../odata-response/odata-set';
import { ODataQueryBase } from '../odata-query/odata-query-base';
import { ODataContext } from '../odata-context';

export class Collection<M extends Model> {
  static type: string = "";
  static modelType: string = "";
  _context: ODataContext;
  _query: ODataQueryBase;
  _models: M[];
  state: {
    page?: number,
    pages?: number,
    size?: number,
    records?: number,
  };

  constructor(models: PlainObject[], query?: ODataQueryBase) {
    this._models = this.parse(models, query);
    this.state = {
      records: this._models.length
    };
    this.setQuery(query);
  }

  setContext(context: ODataContext) {
    this._context = context;
  }

  setQuery(query: ODataQueryBase) {
    this._query = query;
  }

  parse(models: PlainObject[], query: ODataQueryBase) {
    let ctor = <typeof Collection>this.constructor;
    return models.map(model => this._context.createInstance(ctor.modelType, model, query) as M);
  }

  toJSON() {
    let ctor = <typeof Collection>this.constructor;
    return this._models.map(model => model.toJSON());
  }

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
}

export class ODataCollection<M extends ODataModel> extends Collection<M> {
  constructor(
    models: PlainObject[],
    query: ODataQueryBuilder
  ) {
    super(models, query);
  }

  assign(entitySet: ODataSet<ODataModel>, query: ODataQueryBuilder) {
    this.state.records = entitySet.count;
    let skip = entitySet.skip;
    if (skip)
      this.state.size = skip;
    if (this.state.size)
      this.state.pages = Math.ceil(this.state.records / this.state.size);
    this._models = this.parse(entitySet.entities, query);
    return this;
  }

  fetch(options?: any): Observable<this> {
    let query = this._query.clone() as ODataQueryBuilder;
    if (!this.state.page)
      this.state.page = 1;
    if (this.state.size) {
      query.top(this.state.size);
      query.skip(this.state.size * (this.state.page - 1));
    }
    query.countOption(true);
    return query.get<M>({responseType: 'set'})
      .pipe(
        map(set => this.assign(set, query))
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
  select(select?: string | string[]) {
    return (this._query as ODataQueryBuilder).select(select);
  }
  removeSelect() { (this._query as ODataQueryBuilder).removeSelect(); }

  filter(filter?: Filter) {
    return (this._query as ODataQueryBuilder).filter(filter);
  }
  removeFilter() { (this._query as ODataQueryBuilder).removeFilter(); }

  search(search?: string) {
    return (this._query as ODataQueryBuilder).search(search);
  }
  removeSearch() { (this._query as ODataQueryBuilder).removeSearch(); }

  orderBy(orderBy?: string | string[]) {
    return (this._query as ODataQueryBuilder).orderBy(orderBy);
  }
  removeOrderBy() { (this._query as ODataQueryBuilder).removeOrderBy(); }

  expand(expand?: Expand) {
    return (this._query as ODataQueryBuilder).expand(expand);
  }
  removeExpand() { (this._query as ODataQueryBuilder).removeExpand(); }

  groupBy(groupBy?: GroupBy) {
    return (this._query as ODataQueryBuilder).groupBy(groupBy);
  }
  removeGroupBy() { (this._query as ODataQueryBuilder).removeGroupBy(); }
}
