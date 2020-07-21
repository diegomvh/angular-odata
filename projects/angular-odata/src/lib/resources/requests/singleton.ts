import { Observable } from 'rxjs';

import { ODataClient } from '../../client';
import { Expand, Select } from '../builder';
import { QueryOptionNames } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { ODataResource } from '../resource';

import { ODataNavigationPropertyResource } from './navigationproperty';
import { ODataPropertyResource } from './property';
import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataEntityAnnotations } from '../responses';
import { HttpOptions, HttpEntityOptions } from '../http-options';
import { ODataEntityParser } from '../../parsers/index';

export class ODataSingletonResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<R>(client: ODataClient, name: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.singleton, name).setType(type);
    options.keep(QueryOptionNames.format);
    return new ODataSingletonResource<R>(client, segments, options);
  }

  clone() {
    return super.clone<ODataSingletonResource<T>>();
  }
  //#endregion

  //#region Inmutable Resource
  navigationProperty<N>(name: string) {
    let parser = this.client.parserFor(this);
    let type = parser instanceof ODataEntityParser? 
      parser.typeFor(name) : null;
    return ODataNavigationPropertyResource.factory<N>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  property<P>(name: string) {
    let parser = this.client.parserFor(this);
    let type = parser instanceof ODataEntityParser? 
      parser.typeFor(name) : null;
    return ODataPropertyResource.factory<P>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  action<A>(name: string, type?: string) {
    return ODataActionResource.factory<A>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  function<F>(name: string, type?: string) {
    return ODataFunctionResource.factory<F>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  select(opts: Select<T>) {
    let options = this.queryOptions.clone();
    options.option<Select<T>>(QueryOptionNames.select, opts);
    return new ODataSingletonResource<T>(this.client, this.pathSegments.clone(), options);
  }

  expand(opts: Expand<T>) {
    let options = this.queryOptions.clone();
    options.option<Expand<T>>(QueryOptionNames.expand, opts);
    return new ODataSingletonResource<T>(this.client, this.pathSegments.clone(), options);
  }

  format(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataSingletonResource<T>(this.client, this.pathSegments.clone(), options);
  }
  //#endregion

  //#region Mutable Resource
  get query() {
    const options = this.queryOptions;
    return {
      select(opts?: Select<T>) {
        return options.option<Select<T>>(QueryOptionNames.select, opts);
      },
      expand(opts?: Expand<T>) {
        return options.option<Expand<T>>(QueryOptionNames.expand, opts);
      },
      format(opts?: string) {
        return options.option<string>(QueryOptionNames.format, opts);
      }
    }
  }
  //#endregion

  //#region Requests
  get(options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return super.get(
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
      );
  }

  post(entity: Partial<T>, options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return super.post(this.serialize(entity),
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  put(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<[T, ODataEntityAnnotations]> {
    return super.put(this.serialize(entity),
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  patch(entity: Partial<T>, options?: HttpOptions & { etag?: string }): Observable<T> {
    return super.patch(this.serialize(entity),
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  delete(options?: HttpOptions & { etag?: string }): Observable<T> {
    return super.delete(
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }
  //#endregion

}
