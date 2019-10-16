import { ODataNavigationPropertyRequest } from '../odata-request/requests/navigationproperty';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataRequest, ODataEntitySetRequest } from '../odata-request';
import { ODataEntitySet } from '../odata-response';
import { Schema } from '../odata-request/schema';

export class EntityCollection<E> implements Iterable<E> {
  private query: ODataEntitySetRequest<E> | ODataNavigationPropertyRequest<E>;
  private schema: Schema<E>;
  entities: E[];

  state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(entityset: ODataEntitySet<E>, query: ODataRequest, schema: Schema<E>) {
    this.query = query as ODataEntitySetRequest<E> | ODataNavigationPropertyRequest<E>;
    this.schema = schema;
    this.entities = entityset.value.map(entity => this.schema.deserialize(entity, query));
    this.setState({
      records: entityset.count, 
      page: 1, 
      size: entityset.skip || entityset.value.length
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
  // Iterable
  public [Symbol.iterator]() {
    let pointer = 0;
    let entities = this.entities;
    return {
      next(): IteratorResult<E> {
        return {
          done: pointer === entities.length,
          value: entities[pointer++]
        };
      }
    }
  }

  private fetch(): Observable<this> {
    if (this.state.size) {
      this.query.top(this.state.size);
      let skip = this.state.size * (this.state.page - 1);
      if (skip)
        this.query.skip(skip);
    }
    return this.query.get({ responseType: 'entityset'})
      .pipe(
        map(set => {
          if (set) {
            if (set.skip) {
              this.setState({size: set.skip});
            }
            this.entities = set.value.map(entity => this.schema.deserialize(entity, this.query));
          }
          return this;
        }));
  }

  page(page: number) {
    this.setState({page});
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

}
