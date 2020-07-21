import { ODataResource } from '../resource';
import { Expand, Select, Transform, Filter, OrderBy } from '../builder';
import { QueryOptionNames } from '../query-options';

import { ODataReferenceResource } from './reference';
import { ODataQueryOptions } from '../query-options';
import { ODataPathSegments, PathSegmentNames, SegmentOptionNames } from '../path-segments';
import { ODataClient } from '../../client';
import { Observable, empty } from 'rxjs';
import { EntityKey } from '../../types';
import { ODataCountResource } from './count';
import { ODataPropertyResource } from './property';
import { Types } from '../../utils/types';
import { expand, concatMap, toArray } from 'rxjs/operators';
import { ODataEntitiesAnnotations, ODataEntityAnnotations } from '../responses';
import { HttpEntityOptions, HttpEntitiesOptions, HttpOptions } from '../http-options';
import { ODataEntityParser } from '../../parsers/index';

export class ODataNavigationPropertyResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(client: ODataClient, name: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.navigationProperty, name).setType(type);
    options.keep(QueryOptionNames.format);
    return new ODataNavigationPropertyResource<E>(client, segments, options);
  }

  clone() {
    return super.clone<ODataNavigationPropertyResource<T>>();
  }
  //#endregion

  //#region Inmutable Resource
  reference() {
    return ODataReferenceResource.factory(this.client, this.pathSegments.clone(), this.queryOptions.clone());
  }

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

  count() {
    return ODataCountResource.factory(this.client, this.pathSegments.clone(), this.queryOptions.clone());
  }

  select(opts: Select<T>) {
    let options = this.queryOptions.clone();
    options.option<Select<T>>(QueryOptionNames.select, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }

  expand(opts: Expand<T>) {
    let options = this.queryOptions.clone();
    options.option<Expand<T>>(QueryOptionNames.expand, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }

  transform(opts: Transform<T>) {
    let options = this.queryOptions.clone();
    options.option<Transform<T>>(QueryOptionNames.transform, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }

  search(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.search, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }

  filter(opts: Filter) {
    let options = this.queryOptions.clone();
    options.option<Filter>(QueryOptionNames.filter, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }

  orderBy(opts: OrderBy<T>) {
    let options = this.queryOptions.clone();
    options.option<OrderBy<T>>(QueryOptionNames.orderBy, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }

  format(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }

  top(opts: number) {
    let options = this.queryOptions.clone();
    options.option<number>(QueryOptionNames.top, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }

  skip(opts: number) {
    let options = this.queryOptions.clone();
    options.option<number>(QueryOptionNames.skip, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }

  skiptoken(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.skiptoken, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const client = this.client;
    const segments = this.pathSegments;
    return {
      entitySet(name?: string) {
        let segment = segments.segment(PathSegmentNames.entitySet);
        if (!segment)
          throw new Error(`NavigationPropertyResource dosn't have segment for entitySet`);
        if (!Types.isUndefined(name))
          segment.setPath(name);
        return segment.path;
      },
      key(key?: EntityKey<T>) {
        let segment = segments.segment(PathSegmentNames.navigationProperty);
        if (!segment)
          throw new Error(`NavigationPropertyResourse dosn't have segment for key`);
        if (!Types.isUndefined(key)) {
          let parser = client.parserForType(segments.last().type);
          if (parser instanceof ODataEntityParser && Types.isObject(key))
            key = parser.resolveKey(key);
          segment.option(SegmentOptionNames.key, key);
        }
        return segment.option(SegmentOptionNames.key).value();
      }
    }
  }

  get query() {
    const options = this.queryOptions;
    return {
      select(opts?: Select<T>) {
        return options.option<Select<T>>(QueryOptionNames.select, opts);
      },
      expand(opts?: Expand<T>) {
        return options.option<Expand<T>>(QueryOptionNames.expand, opts);
      },
      transform(opts?: Transform<T>) {
        return options.option<Transform<T>>(QueryOptionNames.transform, opts);
      },
      search(opts?: string) {
        return options.option<string>(QueryOptionNames.search, opts);
      },
      filter(opts?: Filter) {
        return options.option<Filter>(QueryOptionNames.filter, opts);
      },
      orderBy(opts?: OrderBy<T>) {
        return options.option<OrderBy<T>>(QueryOptionNames.orderBy, opts);
      },
      format(opts?: string) {
        return options.option<string>(QueryOptionNames.format, opts);
      },
      top(opts?: number) {
        return options.option<number>(QueryOptionNames.top, opts);
      },
      skip(opts?: number) {
        return options.option<number>(QueryOptionNames.skip, opts);
      },
      skiptoken(opts?: string) {
        return options.option<string>(QueryOptionNames.skiptoken, opts);
      }
    }
  }
  //#endregion

  //#region Requests
  get(options: HttpEntityOptions): Observable<[T, ODataEntityAnnotations]>;
  get(options: HttpEntitiesOptions): Observable<[T[], ODataEntitiesAnnotations]>;
  get(options: HttpEntityOptions & HttpEntitiesOptions): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Custom for collections
  collection(options?: HttpOptions & {withCount?: boolean}): Observable<[T[], ODataEntitiesAnnotations]> {
    return this
      .get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
      );
  }

  all(options?: HttpOptions): Observable<T[]> {
    let res = this.clone() as ODataNavigationPropertyResource<T>;
    let fetch = (opts?: { skip?: number, skiptoken?: string, top?: number }): Observable<[T[], ODataEntitiesAnnotations]> => {
      if (opts) {
        if (opts.skiptoken)
          res.skiptoken(opts.skiptoken);
        else if (opts.skip)
          res.skip(opts.skip);
        if (opts.top)
          res.top(opts.top);
      }
      return res.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
      );
    }
    return fetch()
      .pipe(
        expand(([_, annots]) => (annots.skip || annots.skiptoken) ? fetch(annots) : empty()),
        concatMap(([entities, _]) => entities),
        toArray());
  }
  //#endregion

  //#region Custom for single
  single(options?: HttpOptions): Observable<[T, ODataEntityAnnotations]> {
    return this
      .get(
        Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
      );
  }
  //#endregion
}
