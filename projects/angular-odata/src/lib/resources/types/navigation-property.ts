import { Observable, EMPTY } from 'rxjs';
import { expand, concatMap, toArray, map } from 'rxjs/operators';

import { ODataStructuredTypeParser } from '../../parsers/structured-type';
import { ODataModel, ODataCollection } from '../../models';
import { ODataApi } from '../../api';
import { Types } from '../../utils/types';
import { Objects } from '../../utils';
import { EntityKey, ODataResource } from '../resource';
import {
  Expand,
  Select,
  Transform,
  Filter,
  OrderBy,
  isQueryCustomType,
} from '../builder';
import {
  ODataEntities,
  ODataEntitiesAnnotations,
  ODataEntity,
  ODataEntityAnnotations,
} from '../responses';
import { ODataQueryOptions } from '../query-options';
import { QueryOptionNames } from '../query-options';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataReferenceResource } from './reference';
import { ODataCountResource } from './count';
import { ODataPropertyResource } from './property';
import { HttpEntityOptions, HttpEntitiesOptions, HttpOptions } from './options';
import { ODataValueResource } from './value';

export class ODataNavigationPropertyResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<E>(
    api: ODataApi,
    path: string,
    type: string | undefined,
    segments: ODataPathSegments,
    options: ODataQueryOptions
  ) {
    const segment = segments.add(PathSegmentNames.navigationProperty, path);
    if (type) segment.type(type);
    options.keep(QueryOptionNames.format);
    return new ODataNavigationPropertyResource<E>(api, segments, options);
  }
  //#endregion

  clone() {
    return new ODataNavigationPropertyResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  schema() {
    let type = this.type();
    return type !== undefined
      ? this.api.findStructuredTypeForType<T>(type)
      : undefined;
  }

  asModel<M extends ODataModel<T>>(
    entity: Partial<T> | { [name: string]: any },
    { annots, reset }: { annots?: ODataEntityAnnotations; reset?: boolean } = {}
  ): M {
    const type = annots?.type || this.type();
    const Model = this.api.modelForType(type);
    return new Model(entity, { resource: this, annots, reset }) as M;
  }

  asCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    entities: Partial<T>[] | { [name: string]: any }[],
    {
      annots,
      reset,
    }: { annots?: ODataEntitiesAnnotations; reset?: boolean } = {}
  ): C {
    const type = annots?.type || this.type();
    const Collection = this.api.collectionForType(type);
    return new Collection(entities, { resource: this, annots, reset }) as C;
  }

  //#region Inmutable Resource
  key(value: any) {
    const navigation = this.clone();
    var key = this.resolveKey(value);
    if (key !== undefined) navigation.segment.navigationProperty().key(key);
    return navigation;
  }

  value() {
    return ODataValueResource.factory<T>(
      this.api,
      this.type(),
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  reference() {
    return ODataReferenceResource.factory(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }
  navigationProperty<N>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.findParserForType<N>(type);
      type =
        parser instanceof ODataStructuredTypeParser
          ? parser.typeFor(path)
          : undefined;
    }
    return ODataNavigationPropertyResource.factory<N>(
      this.api,
      path,
      type,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  property<P>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.findParserForType<P>(type);
      type =
        parser instanceof ODataStructuredTypeParser
          ? parser.typeFor(path)
          : undefined;
    }
    return ODataPropertyResource.factory<P>(
      this.api,
      path,
      type,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  count() {
    return ODataCountResource.factory(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  cast<C>(type: string) {
    let segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataNavigationPropertyResource<C>(
      this.api,
      segments,
      this.cloneQuery()
    );
  }

  select(opts: Select<T>) {
    const clone = this.clone();
    clone.query.select(opts);
    return clone;
  }

  expand(opts: Expand<T>) {
    const clone = this.clone();
    clone.query.expand(opts);
    return clone;
  }

  transform(opts: Transform<T>) {
    const clone = this.clone();
    clone.query.transform(opts);
    return clone;
  }

  search(opts: string) {
    const clone = this.clone();
    clone.query.search(opts);
    return clone;
  }

  filter(opts: Filter) {
    const clone = this.clone();
    clone.query.filter(opts);
    return clone;
  }

  orderBy(opts: OrderBy<T>) {
    const clone = this.clone();
    clone.query.orderBy(opts);
    return clone;
  }

  format(opts: string) {
    const clone = this.clone();
    clone.query.format(opts);
    return clone;
  }

  top(opts: number) {
    const clone = this.clone();
    clone.query.top(opts);
    return clone;
  }

  skip(opts: number) {
    const clone = this.clone();
    clone.query.skip(opts);
    return clone;
  }

  skiptoken(opts: string) {
    const clone = this.clone();
    clone.query.skiptoken(opts);
    return clone;
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
      },
    };
  }

  /**
   * Handle query options of the navigation property
   * @returns Handler for mutate the query of the navigation property
   */
  get query() {
    return this.entitiesQueryHandler();
  }
  //#endregion

  //#region Requests
  get(options: HttpEntityOptions): Observable<ODataEntity<T>>;
  get(options: HttpEntitiesOptions): Observable<ODataEntities<T>>;
  get(options: HttpEntityOptions & HttpEntitiesOptions): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Shortcuts
  fetch(options?: HttpEntityOptions): Observable<ODataEntity<T>>;
  fetch(options?: HttpEntitiesOptions): Observable<ODataEntities<T>>;
  fetch(
    options: HttpEntityOptions & HttpEntitiesOptions & { etag?: string } = {}
  ): Observable<any> {
    return this.get(options);
  }

  fetchEntity(
    options: HttpOptions & { etag?: string } = {}
  ): Observable<T | null> {
    return this.fetch({ responseType: 'entity', ...options }).pipe(
      map(({ entity }) => entity)
    );
  }

  fetchModel(
    options: HttpOptions & { etag?: string } = {}
  ): Observable<ODataModel<T> | null> {
    return this.fetch({ responseType: 'entity', ...options }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel(entity, { annots, reset: true }) : null
      )
    );
  }

  fetchEntities(options: HttpOptions = {}): Observable<T[] | null> {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities }) => entities)
    );
  }

  fetchCollection(
    options: HttpOptions & { withCount?: boolean } = {}
  ): Observable<ODataCollection<T, ODataModel<T>> | null> {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) =>
        entities ? this.asCollection(entities, { annots, reset: true }) : null
      )
    );
  }

  fetchAll(options: HttpOptions = {}): Observable<T[]> {
    let res = this.clone();
    // Clean Paging
    res.query.clearPaging();
    let fetch = (opts?: {
      skip?: number;
      skiptoken?: string;
      top?: number;
    }): Observable<ODataEntities<T>> => {
      if (opts) {
        res.query.paging(opts);
      }
      return res.get({ responseType: 'entities', ...options });
    };
    return fetch().pipe(
      expand(({ annots: meta }) =>
        meta.skip || meta.skiptoken ? fetch(meta) : EMPTY
      ),
      concatMap(({ entities }) => entities || []),
      toArray()
    );
  }
  //#endregion
}
