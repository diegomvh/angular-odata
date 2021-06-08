import { Observable, EMPTY } from 'rxjs';
import { expand, concatMap, toArray, map } from 'rxjs/operators';

import { Expand, Select, Transform, Filter, OrderBy, isQueryCustomType } from '../builder';
import { QueryOptionNames } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';

import { ODataActionResource } from './action';
import { ODataFunctionResource } from './function';
import { ODataQueryOptions } from '../query-options';
import { ODataEntityResource } from './entity';
import { ODataCountResource } from './count';
import { EntityKey } from '../../types';
import { ODataResource } from '../resource';
import { HttpEntitiesOptions, HttpOptions } from './options';
import { ODataEntity, ODataEntities, ODataEntitiesAnnotations } from '../responses';
import { ODataModel, ODataCollection } from '../../models';
import { ODataApi } from '../../api';

export class ODataEntitySetResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(api: ODataApi, path: string, type: string | undefined, segments: ODataPathSegments, query: ODataQueryOptions) {
    const segment = segments.add(PathSegmentNames.entitySet, path)
    if (type)
      segment.type(type);
    return new ODataEntitySetResource<E>(api, segments, query);
  }

  clone() {
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), this.cloneQuery());
  }
  //#endregion

  asCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    entities: Partial<T>[] | {[name: string]: any}[],
    {annots, reset = false}: { annots?: ODataEntitiesAnnotations, reset?: boolean} = {}
  ): C {
    let schema = this.schema;
    if (annots?.type !== undefined) {
      schema = this.api.findStructuredTypeForType(annots.type);
    }
    const Collection = schema?.collection || ODataCollection;
    return new Collection(entities, {resource: this, annots, reset}) as C;
  }

  //#region Entity Config
  get schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findStructuredTypeForType<T>(type) :
      undefined;
  }
  ////#endregion

  //#region Inmutable Resource
  entity(key?: EntityKey<T>) {
    const entity = ODataEntityResource.factory<T>(this.api, this.cloneSegments(), this.cloneQuery());
    if (key !== undefined) {
      return entity.key(key);
    }
    return entity;
  }

  cast<C>(type: string) {
    let segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataEntitySetResource<C>(this.api, segments, this.cloneQuery());
  }

  action<P, R>(name: string) {
    let type;
    let path = name;
    const callable = this.api.findCallableForType(name);
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
    }
    return ODataActionResource.factory<P, R>(this.api, path, type, this.cloneSegments(), this.cloneQuery());
  }

  function<P, R>(name: string) {
    let type;
    let path = name;
    const callable = this.api.findCallableForType(name);
    if (callable !== undefined) {
      path = callable.path();
      type = callable.type();
    }
    return ODataFunctionResource.factory<P, R>(this.api, path, type, this.cloneSegments(), this.cloneQuery());
  }

  count() {
    return ODataCountResource.factory(this.api, this.cloneSegments(), this.cloneQuery());
  }

  select(opts: Select<T>) {
    let options = this.cloneQuery();
    options.option<Select<T>>(QueryOptionNames.select, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }

  expand(opts: Expand<T>) {
    let options = this.cloneQuery();
    options.option<Expand<T>>(QueryOptionNames.expand, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }

  transform(opts: Transform<T>) {
    let options = this.cloneQuery();
    options.option<Transform<T>>(QueryOptionNames.transform, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }

  search(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.search, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }

  filter(opts: Filter) {
    let options = this.cloneQuery();
    options.option<Filter>(QueryOptionNames.filter, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }

  orderBy(opts: OrderBy<T>) {
    let options = this.cloneQuery();
    options.option<OrderBy<T>>(QueryOptionNames.orderBy, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }

  format(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }

  top(opts: number) {
    let options = this.cloneQuery();
    options.option<number>(QueryOptionNames.top, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }

  skip(opts: number) {
    let options = this.cloneQuery();
    options.option<number>(QueryOptionNames.skip, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }

  skiptoken(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.skiptoken, opts);
    return new ODataEntitySetResource<T>(this.api, this.cloneSegments(), options);
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const segments = this.pathSegments;
    return {
      entitySet() {
        return segments.get(PathSegmentNames.entitySet);
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
  post(attrs: Partial<T>, options: HttpOptions = {}): Observable<ODataEntity<T>> {
    return super.post(attrs, {responseType: 'entity', ...options});
  }

  get(options: HttpOptions & { withCount?: boolean } = {}): Observable<ODataEntities<T>> {
    return super.get({responseType: 'entities', ...options});
  }
  //#endregion

  //#region Shortcuts
  fetchEntities(options?: HttpOptions & { withCount?: boolean }): Observable<T[] | null> {
    return this.get(options).pipe(map(({entities}) => entities));
  }

  fetchCollection(options?: HttpOptions & { withCount?: boolean }): Observable<ODataCollection<T, ODataModel<T>> | null> {
    return this.get(options).pipe(map(({entities, annots}) => entities ? this.asCollection(entities, { annots, reset: true}) : null));
  }

  fetchAll(options?: HttpOptions): Observable<T[]> {
    let res = this.clone();
    // Clean
    res.query.skip().clear();
    res.query.top().clear();
    res.query.skiptoken().clear();
    let fetch = (opts?: { skip?: number, skiptoken?: string, top?: number }): Observable<ODataEntities<T>> => {
      if (opts) {
        if (opts.skiptoken)
          res.query.skiptoken(opts.skiptoken);
        else if (opts.skip)
          res.query.skip(opts.skip);
        if (opts.top)
          res.query.top(opts.top);
      }
      return res.get(options);
    }
    return fetch()
      .pipe(
        expand(({annots: meta})  => (meta.skip || meta.skiptoken) ? fetch(meta) : EMPTY),
        concatMap(({entities}) => entities || []),
        toArray());
  }
  //#endregion
}
