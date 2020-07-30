import { Observable, empty } from 'rxjs';

import { Expand, Select, Transform, Filter, OrderBy, PlainObject } from '../builder';
import { QueryOptionNames } from '../query-options';
import { ODataClient } from '../../client';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataQueryOptions } from '../query-options';
import { ODataEntityResource } from './entity';
import { ODataCountResource } from './count';
import { EntityKey } from '../../types';
import { ODataResource } from '../resource';
import { expand, concatMap, toArray } from 'rxjs/operators';
import { Types } from '../../utils';
import { HttpOptions, HttpEntityOptions, HttpEntitiesOptions } from '../http-options';
import { ODataModel } from '../../models';
import { ODataEntity, ODataEntities } from '../responses/response';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(client: ODataClient, name: string, type: string, segments: ODataPathSegments, options: ODataQueryOptions) {
    segments.segment(PathSegmentNames.entitySet, name).setType(type);
    options.keep(QueryOptionNames.filter, QueryOptionNames.orderBy, QueryOptionNames.skip, QueryOptionNames.transform, QueryOptionNames.top, QueryOptionNames.search, QueryOptionNames.format);
    return new ODataEntitySetResource<E>(client, segments, options);
  }

  clone() {
    return super.clone<ODataEntitySetResource<T>>();
  }
  //#endregion

  //#region Inmutable Resource
  entity(key: EntityKey<T>) {
    const entity = ODataEntityResource.factory<T>(this.client, this.pathSegments.clone(), this.queryOptions.clone());
    entity.segment.key(key);
    return entity;
  }

  cast<C extends T>(type: string) {
    let segments = this.pathSegments.clone();
    segments.segment(PathSegmentNames.type, type).setType(type);
    return new ODataEntitySetResource<C>(this.client, segments, this.queryOptions.clone());
  }

  action<P, R>(type: string) {
    return ODataActionResource.factory<P, R>(this.client, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  function<P, R>(type: string) {
    return ODataFunctionResource.factory<P, R>(this.client, type, this.pathSegments.clone(), this.queryOptions.clone());
  }

  count() {
    return ODataCountResource.factory(this.client, this.pathSegments.clone(), this.queryOptions.clone());
  }

  select(opts: Select<T>) {
    let options = this.queryOptions.clone();
    options.option<Select<T>>(QueryOptionNames.select, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  expand(opts: Expand<T>) {
    let options = this.queryOptions.clone();
    options.option<Expand<T>>(QueryOptionNames.expand, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  transform(opts: Transform<T>) {
    let options = this.queryOptions.clone();
    options.option<Transform<T>>(QueryOptionNames.transform, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  search(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.search, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  filter(opts: Filter) {
    let options = this.queryOptions.clone();
    options.option<Filter>(QueryOptionNames.filter, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  orderBy(opts: OrderBy<T>) {
    let options = this.queryOptions.clone();
    options.option<OrderBy<T>>(QueryOptionNames.orderBy, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  format(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  top(opts: number) {
    let options = this.queryOptions.clone();
    options.option<number>(QueryOptionNames.top, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  skip(opts: number) {
    let options = this.queryOptions.clone();
    options.option<number>(QueryOptionNames.skip, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  skiptoken(opts: string) {
    let options = this.queryOptions.clone();
    options.option<string>(QueryOptionNames.skiptoken, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }

  custom(opts: PlainObject) {
    let options = this.queryOptions.clone();
    options.option<PlainObject>(QueryOptionNames.custom, opts);
    return new ODataEntitySetResource<T>(this.client, this.pathSegments.clone(), options);
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const segments = this.pathSegments;
    return {
      entitySet(name?: string) {
        let segment = segments.segment(PathSegmentNames.entitySet);
        if (!segment)
          throw new Error(`EntityResourse dosn't have segment for entitySet`);
        if (!Types.isUndefined(name))
          segment.setPath(name);
        return segment.path;
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
  post(entity: Partial<T>, options?: HttpOptions): Observable<ODataEntity<T>> {
    return super.post(entity,
      Object.assign<HttpEntityOptions, HttpOptions>(<HttpEntityOptions>{responseType: 'entity'}, options || {})
    );
  }

  get(options?: HttpOptions & { withCount?: boolean }): Observable<ODataEntities<T>> {
    return super.get(
      Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{responseType: 'entities'}, options || {})
    );
  }
  //#endregion

  //#region Custom for collections
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
        expand(({annotations})  => (annotations.skip || annotations.skiptoken) ? fetch(annotations) : empty()),
        concatMap(({entities}) => entities),
        toArray());
  }
  //#endregion
}
