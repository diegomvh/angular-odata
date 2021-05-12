import { ODataResource } from '../resource';
import { Expand, Select, Transform, Filter, OrderBy } from '../builder';
import { QueryOptionNames } from '../query-options';

import { ODataReferenceResource } from './reference';
import { ODataQueryOptions } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { Observable, empty, EMPTY } from 'rxjs';
import { EntityKey } from '../../types';
import { ODataCountResource } from './count';
import { ODataPropertyResource } from './property';
import { expand, concatMap, toArray, map } from 'rxjs/operators';
import { HttpEntityOptions, HttpEntitiesOptions, HttpOptions } from './options';
import { ODataEntities, ODataEntitiesAnnotations, ODataEntity, ODataEntityAnnotations } from '../responses';
import { ODataValueResource } from './value';
import { ODataStructuredTypeParser } from '../../parsers/structured-type';
import { ODataModel, ODataCollection } from '../../models';
import { ODataApi } from '../../api';
import { Types } from '../../utils/types';

export class ODataNavigationPropertyResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(api: ODataApi, path: string, type: string | undefined, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.add(PathSegmentNames.navigationProperty, path)
    if (type)
      segment.type(type);
    options.keep(QueryOptionNames.format);
    return new ODataNavigationPropertyResource<E>(api, segments, options);
  }

  clone() {
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), this.cloneQuery());
  }
  //#endregion

  asModel<M extends ODataModel<T>>(entity: Partial<T> | {[name: string]: any}, {annots, reset}: { annots?: ODataEntityAnnotations, reset?: boolean} = {}): M {
    let schema = this.schema;
    if (annots?.type !== undefined) {
      schema = this.api.findStructuredTypeForType(annots.type);
    }
    const Model = schema?.model || ODataModel;
    return new Model(entity, {resource: this, annots, reset}) as M;
  }

  asCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    entities: Partial<T>[] | {[name: string]: any}[],
    {annots, reset}: {annots?: ODataEntitiesAnnotations, reset?: boolean} = {}
  ): C {
    let schema = this.schema;
    if (annots?.type !== undefined) {
      schema = this.api.findStructuredTypeForType(annots.type);
    }
    const Collection = schema?.collection || ODataCollection;
    return new Collection(entities, {resource: this, annots, reset}) as C;
  }

  //#region Function Config
  get schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findStructuredTypeForType<T>(type) :
      undefined;
  }
  ////#endregion

  //#region Inmutable Resource
  key(key: EntityKey<T>) {
    const navigation = this.clone();
    navigation.segment.navigationProperty().key( Types.isObject(key) ? this.schema?.resolveKey(key as {[name: string]: any}) : key );
    return navigation;
  }

  entity(key?: EntityKey<T>) {
    const navigation = this.clone();
    navigation.segment.navigationProperty().key( Types.isObject(key) ? this.schema?.resolveKey(key as {[name: string]: any}) : key );
    return navigation;
  }

  value() {
    return ODataValueResource.factory<T>(this.api, this.type(), this.cloneSegments(), this.cloneQuery());
  }

  reference() {
    return ODataReferenceResource.factory(this.api, this.cloneSegments(), this.cloneQuery());
  }
  navigationProperty<N>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.findParserForType<N>(type);
      type = parser instanceof ODataStructuredTypeParser?
        parser.typeFor(path) : undefined;
    }
    return ODataNavigationPropertyResource.factory<N>(this.api, path, type, this.cloneSegments(), this.cloneQuery());
  }

  property<P>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.findParserForType<P>(type);
      type = parser instanceof ODataStructuredTypeParser?
        parser.typeFor(path) : undefined;
    }
    return ODataPropertyResource.factory<P>(this.api, path, type, this.cloneSegments(), this.cloneQuery());
  }

  count() {
    return ODataCountResource.factory(this.api, this.cloneSegments(), this.cloneQuery());
  }

  cast<C>(type: string) {
    let segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataNavigationPropertyResource<C>(this.api, segments, this.cloneQuery());
  }

  select(opts: Select<T>) {
    let options = this.cloneQuery();
    options.option<Select<T>>(QueryOptionNames.select, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }

  expand(opts: Expand<T>) {
    let options = this.cloneQuery();
    options.option<Expand<T>>(QueryOptionNames.expand, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }

  transform(opts: Transform<T>) {
    let options = this.cloneQuery();
    options.option<Transform<T>>(QueryOptionNames.transform, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }

  search(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.search, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }

  filter(opts: Filter) {
    let options = this.cloneQuery();
    options.option<Filter>(QueryOptionNames.filter, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }

  orderBy(opts: OrderBy<T>) {
    let options = this.cloneQuery();
    options.option<OrderBy<T>>(QueryOptionNames.orderBy, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }

  format(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.format, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }

  top(opts: number) {
    let options = this.cloneQuery();
    options.option<number>(QueryOptionNames.top, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }

  skip(opts: number) {
    let options = this.cloneQuery();
    options.option<number>(QueryOptionNames.skip, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }

  skiptoken(opts: string) {
    let options = this.cloneQuery();
    options.option<string>(QueryOptionNames.skiptoken, opts);
    return new ODataNavigationPropertyResource<T>(this.api, this.cloneSegments(), options);
  }
  //#endregion

  //#region Mutable Resource
  get segment() {
    const segments = this.pathSegments;
    return {
      entitySet() {
        return segments.get(PathSegmentNames.entitySet);
      },
      singleton() {
        return segments.get(PathSegmentNames.singleton);
      },
      navigationProperty() {
        return segments.get(PathSegmentNames.navigationProperty);
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
  get(options: HttpEntityOptions): Observable<ODataEntity<T>>;
  get(options: HttpEntitiesOptions): Observable<ODataEntities<T>>;
  get(options: HttpEntityOptions & HttpEntitiesOptions): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Custom
  fetchEntity(options: HttpOptions & { etag?: string } = {}): Observable<T | null> {
    return this.get({ responseType: 'entity', ...options}).pipe(map(({entity}) => entity));
  }

  fetchModel(options: HttpOptions & { etag?: string } = {}): Observable<ODataModel<T> | null> {
    return this.get({ responseType: 'entity', ...options}).pipe(map(({entity, annots}) => entity ? this.asModel(entity, {annots, reset: true}) : null));
  }

  fetchEntities(options: HttpOptions = {}): Observable<T[] | null> {
    return this.get({ responseType: 'entities', ...options}).pipe(map(({entities}) => entities));
  }

  fetchCollection(options: HttpOptions & { withCount?: boolean } = {}): Observable<ODataCollection<T, ODataModel<T>> | null> {
    return this.get({responseType: 'entities', ...options}).pipe(map(({entities, annots}) => entities ? this.asCollection(entities, {annots, reset: true}) : null));
  }

  fetchAll(options: HttpOptions = {}): Observable<T[]> {
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
      return res.get({responseType: 'entities', ...options});
    }
    return fetch()
      .pipe(
        expand(({annots: meta}) => (meta.skip || meta.skiptoken) ? fetch(meta) : EMPTY),
        concatMap(({entities}) => entities || []),
        toArray());
  }
  //#endregion
}
