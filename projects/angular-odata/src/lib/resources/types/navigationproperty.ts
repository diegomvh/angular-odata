import { ODataResource } from '../resource';
import { Expand, Select, Transform, Filter, OrderBy, PlainObject } from '../builder';
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
import { expand, concatMap, toArray, map } from 'rxjs/operators';
import { HttpEntityOptions, HttpEntitiesOptions, HttpOptions } from './options';
import { ODataEntities, ODataEntity } from '../responses/index';
import { ODataValueResource } from './value';
import { ODataEntityParser } from '../../parsers/entity';
import { ODataModel, ODataCollection } from '../../models';

export class ODataNavigationPropertyResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(client: ODataClient, path: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.navigationProperty, path).setType(type);
    options.keep(QueryOptionNames.format);
    return new ODataNavigationPropertyResource<E>(client, segments, options);
  }

  clone() {
    return super.clone<ODataNavigationPropertyResource<T>>();
  }
  //#endregion

  //#region Function Config
  get schema() {
    return this.api
    .structuredTypeForType<T>(this.type());
  }
  ////#endregion

  //#region Inmutable Resource
  value() {
    return ODataValueResource.factory<T>(this.client, this.type(), this.pathSegments.clone(), this.queryOptions.clone());
  }

  reference() {
    return ODataReferenceResource.factory(this.client, this.pathSegments.clone(), this.queryOptions.clone());
  }

  navigationProperty<N>(name: string) {
    let parser = this.client.parserFor<N>(this);
    let type = parser instanceof ODataEntityParser?
      parser.typeFor(name) : null;
    return ODataNavigationPropertyResource.factory<N>(this.client, name, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  property<P>(name: string) {
    let parser = this.client.parserFor<P>(this);
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

  custom(opts: PlainObject) {
    let options = this.queryOptions.clone();
    options.option<PlainObject>(QueryOptionNames.custom, opts);
    return new ODataNavigationPropertyResource<T>(this.client, this.pathSegments.clone(), options);
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const res = this;
    const client = this.client;
    const segments = this.pathSegments;
    return {
      entitySet(name?: string) {
        let segment = segments.segment(PathSegmentNames.entitySet);
        if (!segment)
          throw new Error(`NavigationPropertyResource dosn't have segment for entitySet`);
        if (!Types.isUndefined(name))
          segment.setPath(name);
        return segment;
      },
      key(key?: EntityKey<T>) {
        let segment = segments.segment(PathSegmentNames.navigationProperty);
        if (!segment)
          throw new Error(`NavigationPropertyResourse dosn't have segment for key`);
        if (!Types.isUndefined(key)) {
          let parser = client.parserFor<T>(res);
          if (parser instanceof ODataEntityParser && Types.isObject(key))
            key = parser.resolveKey(key);
          segment.option(SegmentOptionNames.key, key);
        }
        return segment.option(SegmentOptionNames.key);
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
      },
      custom(opts?: PlainObject) {
        return options.option<PlainObject>(QueryOptionNames.custom, opts);
      }
    }
  }
  //#endregion

  //#region Requests
  get(options: HttpEntityOptions): Observable<ODataEntity<T>>;
  get(options: HttpEntitiesOptions): Observable<ODataEntities<T>>;
  get(options: HttpEntityOptions & HttpEntitiesOptions): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Custom
  all(options?: HttpOptions): Observable<T[]> {
    let res = this.clone();
    let fetch = (opts?: { skip?: number, skiptoken?: string, top?: number }): Observable<ODataEntities<T>> => {
      if (opts) {
        if (opts.skiptoken)
          res.query.skiptoken(opts.skiptoken);
        else if (opts.skip)
          res.query.skip(opts.skip);
        if (opts.top)
          res.query.top(opts.top);
      }
      return res.get(
        Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
      );
    }
    return fetch()
      .pipe(
        expand(({meta}) => (meta.skip || meta.skiptoken) ? fetch(meta) : empty()),
        concatMap(({entities}) => entities),
        toArray());
  }

  collection(options?: HttpOptions): Observable<ODataCollection<T, ODataModel<T>>> {
    return this.get(
      Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
    ).pipe(map(({entities, meta}) => this.asCollection(entities, meta)));
  }

  fetch(options?: HttpOptions): Observable<T> {
    return this.get(
      Object.assign<HttpOptions, HttpEntityOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {})
    ).pipe(map(({entity}) => entity));
  }

  model(options?: HttpOptions): Observable<ODataModel<T>> {
    return this.get(
      Object.assign<HttpOptions, HttpEntityOptions>(<HttpEntityOptions>{ responseType: 'entity' }, options || {})
    ).pipe(map(({entity, meta}) => this.asModel(entity, meta)));
  }
  //#endregion
}
