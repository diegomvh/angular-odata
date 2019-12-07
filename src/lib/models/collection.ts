import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ODataEntitySetResource, Filter, Expand, GroupBy, Select, OrderBy, ODataEntityResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataEntityAnnotations, ODataPropertyAnnotations, ODataRelatedAnnotations, ODataCollectionAnnotations } from '../resources';

import { ODataModel } from './model';
import { ODataSettings } from './settings';

type ODataModelCollectionResource<T> = ODataEntitySetResource<any> | ODataPropertyResource<any> | ODataNavigationPropertyResource<any>;
type ODataModelCollectionAnnotations = ODataCollectionAnnotations | ODataPropertyAnnotations | ODataRelatedAnnotations;

export class ODataModelCollection<M extends ODataModel> implements Iterable<M> {
  _settings: ODataSettings; 
  _resource: ODataModelCollectionResource<any>;
  _annotations: ODataModelCollectionAnnotations;
  _models: M[];
  _state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(models: M[] | null, annots: ODataCollectionAnnotations | null, resource: ODataModelCollectionResource<any>, settings: ODataSettings) {
    this._settings = settings;
    this.assign(models || [], annots, resource);
  }

  private setAnnotations(annots: ODataCollectionAnnotations) {
    this._annotations = annots;
    if (annots.skip && annots.count) {
      this._state.records = annots.count;
      this._state.size = annots.skip;
      this._state.pages = Math.ceil(annots.count / annots.skip);
    };
  }

  private assign(models: any[], annots: ODataModelCollectionAnnotations, resource: ODataModelCollectionResource<any>) {
    this.setAnnotations(annots as ODataCollectionAnnotations);
    this._resource = resource;
    let Klass = this._settings.modelForType(this._resource.type());
    this._models = models.map(model => new Klass(
      model, 
      ODataEntityAnnotations.factory(model),
      this._resource.entity(model), 
      this._settings
    ) as M);
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
        map(([models, annots]) => {
          this.assign(models, annots, resource);
          return this;
        }));
  }

  page(page: number) {
    this._state.page = page;
    return this.fetch();
  }

  size(size: number) {
    this._state.size = size;
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

  count() {
    return (this._resource as ODataEntitySetResource<any>).count().get();
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
