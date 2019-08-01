import { ODataModel, Model } from './odata-model';
import { map } from 'rxjs/operators';
import { ODataQueryBuilder, Filter, Expand, GroupBy } from '../odata-query/odata-query-builder';
import { Observable } from 'rxjs';
import { EntitySet } from '../odata-response/entity-collection';

export class Collection {
  static model: typeof Model = null;
  models: Model[];
  state: {
    page?: number,
    pages?: number,
    size?: number,
    records?: number,
  };

  constructor(models: {[name: string]: any}[], ...params: any) {
    this.models = this.parse(models);
    this.state = {
      records: this.models.length
    };
  }

  parse(models: {[name: string]: any}[], ...params: any) {
    let ctor = <typeof Collection>this.constructor;
    return models.map(model => new ctor.model(model, ...params));
  }

  toJSON() {
    let ctor = <typeof Collection>this.constructor;
    return this.models.map(model => model.toJSON());
  }
}

export class ODataCollection extends Collection {
  private query: ODataQueryBuilder;
  constructor(
    models: {[name: string]: any}[], 
    query: ODataQueryBuilder,
    ...params: any
  ) {
    super(models, ...params);
    this.attach(query);
  }

  attach(query: ODataQueryBuilder) {
    this.query = query;
  }

  detached(): boolean {
    return !!this.query;
  }

  assign(entitySet: EntitySet<ODataModel>, query: ODataQueryBuilder) {
    this.state.records = entitySet.getCount();
    let skip = entitySet.getSkip();
    if (skip)
      this.state.size = skip;
    if (this.state.size)
      this.state.pages = Math.ceil(this.state.records / this.state.size);
    this.models = this.parse(entitySet.getEntities(), query);
    return this;
  }

  fetch(options?: any): Observable<this> {
    let query = this.query.clone();
    if (!this.state.page)
      this.state.page = 1;
    if (this.state.size) {
      query.top(this.state.size);
      query.skip(this.state.size * (this.state.page - 1));
    }
    query.count(true);
    return query.get(options)
      .pipe(
        map(resp => this.assign(resp.toEntitySet(), query))
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
    return this.query.select(select);
  }
  removeSelect() { this.query.removeSelect(); }

  filter(filter?: Filter) {
    return this.query.filter(filter);
  }
  removeFilter() { this.query.removeFilter(); }

  search(search?: string) {
    return this.query.search(search);
  }
  removeSearch() { this.query.removeSearch(); }

  orderBy(orderBy?: string | string[]) {
    return this.query.orderBy(orderBy);
  }
  removeOrderBy() { this.query.removeOrderBy(); }

  expand(expand?: Expand) {
    return this.query.expand(expand);
  }
  removeExpand() { this.query.removeExpand(); }

  groupBy(groupBy?: GroupBy) {
    return this.query.groupBy(groupBy);
  }
  removeGroupBy() { this.query.removeGroupBy(); }
}