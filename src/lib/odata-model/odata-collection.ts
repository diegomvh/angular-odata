import { ODataModel, Model } from './odata-model';
import { map } from 'rxjs/operators';
import { ODataContext } from '../odata-context';
import { ODataQueryBuilder, Filter, Expand, PlainObject, ArrayHandler } from '../odata-query/odata-query-builder';
import { Observable } from 'rxjs';
import { EntitySet } from '../odata-response/entity-collection';
import { GroupBy } from 'angular-odata/public_api';

export class Collection<M extends Model> {
  static type: string = null;
  static model: string = null;
  models: M[];
  state: {
    page?: number,
    pages?: number,
    size?: number,
    records?: number,
  };

  constructor(models: {[name: string]: any}[], private context: ODataContext) {
    this.models = this.parse(models);
    this.state = {
      records: this.models.length
    };
  }

  parse(models: {[name: string]: any}[], ...params: any) {
    let ctor = <typeof Collection>this.constructor;
    return models.map(model => this.context.parse(model, ctor.model, ...params));
  }

  toJSON() {
    let ctor = <typeof Collection>this.constructor;
    return this.models.map(model => this.context.toJSON(model, ctor.model));
  }
}

export class ODataCollection<M extends ODataModel> extends Collection<M> {
  constructor(
    models: {[name: string]: any}[], 
    context: ODataContext, 
    private query: ODataQueryBuilder
  ) {
    super(models, context)
    this.query = query;
  }

  assign(entitySet: EntitySet<M>, query: ODataQueryBuilder) {
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

  filter(filter?: Filter) {
    return this.query.filter(filter);
  }

  search(search?: string) {
    return this.query.search(search);
  }

  orderBy(orderBy?: string | string[]) {
    return this.query.orderBy(orderBy);
  }

  expand(expand?: Expand) {
    return this.query.expand(expand);
  }

  groupBy(groupBy?: GroupBy) {
    return this.query.groupBy(groupBy);
  }
}