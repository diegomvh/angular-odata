import { ODataModel, Model } from './odata-model';
import { map } from 'rxjs/operators';
import { ODataContext } from '../odata-context';
import { ODataQueryBuilder } from '../odata-query/odata-query-builder';
import { Observable } from 'rxjs';
import { EntitySet } from '../odata-response/entity-collection';

export class Collection<M extends Model> {
  static type: string = null;
  static model: string = null;
  models: M[];
  state: {
    page: number,
    size?: number,
    records?: number,
    pages?: number,
  } = {
    page: 1
  };

  constructor(attrs: {[name: string]: any}[], query: ODataQueryBuilder) {
    this.models = this.parse(attrs, query);
  }

  parse(attrs: {[name: string]: any}[], query: ODataQueryBuilder) {
    let ctor = <typeof Collection>this.constructor;
    return attrs.map(attr => query.service.context.parseValue(attr, ctor.model, query));
  }

  toJSON() {
    return this.models.map(model => model.toJSON());
  }
}

export class ODataCollection<M extends ODataModel> extends Collection<M> {
  query: ODataQueryBuilder;

  constructor(models: {[name: string]: any}[], query: ODataQueryBuilder) {
    super(models, query)
    this.query = query;
  }

  private assign(entitySet: EntitySet<M>, query: ODataQueryBuilder) {
    this.state.records = entitySet.getCount();
    let skip = entitySet.getSkip();
    if (skip)
      this.state.size = skip;
    this.state.pages = Math.ceil(this.state.records / this.state.size);
    this.models = this.parse(entitySet.getEntities(), query);
    return this;
  }

  fetch(options?: any): Observable<this> {
    let query = this.query.clone();
    if (this.state.size)
      query.top(this.state.size).skip((this.state.page - 1) * this.state.size);
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
    return this.getPage(this.state.page - 1, options);
  }

  getNextPage(options?: any) {
    return this.getPage(this.state.page + 1, options);
  }

  getLastPage(options?: any) {
    return this.getPage(this.state.pages, options);
  }

  setPageSize(size: number) { this.state.size = size; }
}
