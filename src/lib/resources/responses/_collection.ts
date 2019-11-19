import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataEntitySetResource, ODataNavigationPropertyResource } from '../requests';
import { ODataCollection } from './collection';

export class ODataVCollection<E> implements Iterable<E> {
  private _query: ODataEntitySetResource<E> | ODataNavigationPropertyResource<E>;
  entities: E[];

  state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(entityset: ODataCollection<E>, query: ODataEntitySetResource<E> | ODataNavigationPropertyResource<E>) {
    this.entities = entityset.value;
    this._query = query;
    let records = entityset.count;
    let size = (query.skip().value() || entityset.skip || entityset.value.length);
    let skip = (query.skip().value() || entityset.skip || 0);
    let page = (query.top().value()) ? 
      Math.ceil(skip / query.top().value()) + 1 : 1;
    this.setState({ records, page, size });
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

  fetch(): Observable<this> {
    if (this.state.size) {
      this._query.top(this.state.size);
      let skip = this.state.size * (this.state.page - 1);
      if (skip)
        this._query.skip(skip);
    }
    return this._query.get({ responseType: 'entityset'})
      .pipe(
        map(set => {
          if (set) {
            if (set.skip) {
              this.setState({size: set.skip});
            }
            this.entities = set.value;
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
