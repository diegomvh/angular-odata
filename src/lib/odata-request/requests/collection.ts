import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { ODataSet } from '../../odata-response/odata-set';
import { ODataCountRequest } from './count';
import { PlainObject, Options, Filter, GroupBy, Transform, Expand } from '../types';
import { ODataEntityRequest } from './entity';

export class ODataCollectionRequest<T> extends ODataRequest {
  entity(key?: string | number | PlainObject) {
    let entity = this.clone(ODataEntityRequest) as ODataEntityRequest<T>;
    if (key)
      entity.key(key);
    return entity;
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<T>> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'set',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  count() {
    return new ODataCountRequest(this.service, 
      this.segments.toObject(), 
      this.options.toObject());
  }

  select(opts?: string | string[]) {
    return this.options.option<string>(Options.select, opts);
  }
  removeSelect() {
    this.options.remove(Options.select);
  }

  search(opts?: string) {
    return this.options.value<string>(Options.search, opts);
  }
  removeSearch() {
    this.options.remove(Options.search);
  }

  filter(opts?: Filter) {
    return this.options.option<Filter>(Options.filter, opts);
  }
  removeFilter() {
    this.options.remove(Options.filter);
  }

  groupBy(opts?: GroupBy) {
    return this.options.option(Options.groupBy, opts);
  }
  removeGroupBy() {
    this.options.remove(Options.groupBy);
  }

  transform(opts?: Transform) {
    return this.options.option<Transform>(Options.transform, opts);
  }
  removeTransform() {
    this.options.remove(Options.transform);
  }

  orderBy(opts?: string | string[]) {
    return this.options.option<string>(Options.orderBy, opts);
  }
  removeOrderBy() { 
    this.options.remove(Options.orderBy); 
  }

  expand(opts?: Expand) {
    return this.options.option<Expand>(Options.expand, opts);
  }
  removeExpand() {
    this.options.remove(Options.expand);
  }

  format(opts?: string) {
    return this.options.value<string>(Options.format, opts);
  }
  removeFormat() {
    this.options.remove(Options.format);
  }

  top(opts?: number) {
    return this.options.value<number>(Options.top, opts);
  }
  removeTop() {
    this.options.remove(Options.top);
  }

  skip(opts?: number) {
    return this.options.value<number>(Options.skip, opts);
  }
  removeSkip() {
    this.options.remove(Options.skip);
  }
  
  addCount() {
    return this.options.value<boolean>(Options.count, true);
  }

  removeCount() {
    this.options.remove(Options.count);
  }

  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(Options.custom, opts);
  }

  removeCustom() {
    this.options.remove(Options.custom);
  }
}
