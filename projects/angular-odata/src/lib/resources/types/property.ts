import { EMPTY, Observable } from 'rxjs';
import { concatMap, expand, map, toArray } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { ODataStructuredTypeParser } from '../../schema';
//import { ODataNavigationPropertyResource } from './navigation-property';
import { PathSegmentNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import {
  ODataEntities,
  ODataEntitiesAnnotations,
  ODataEntity,
  ODataEntityAnnotations,
  ODataProperty,
} from '../responses';
import {
  ODataEntitiesOptions,
  ODataEntityOptions,
  ODataOptions,
  ODataPropertyOptions,
} from './options';
import { ODataValueResource } from './value';

export class ODataPropertyResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<P>(
    api: ODataApi,
    path: string,
    type: string | undefined,
    segments: ODataPathSegments,
    options: ODataQueryOptions<P>
  ) {
    const segment = segments.add(PathSegmentNames.property, path);
    if (type) segment.type(type);
    options.clear();
    return new ODataPropertyResource<P>(api, segments, options);
  }

  clone() {
    return new ODataPropertyResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery<T>()
    );
  }
  //#endregion

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

  key(value: any) {
    const property = this.clone();
    var key = this.resolveKey(value);
    if (key !== undefined) property.segment((s) => s.property().key(key));
    return property;
  }

  keys(values: any[]) {
    const property = this.clone();
    const types = this.pathSegments.types({ key: true });
    const keys = values.map((value, index) =>
      ODataResource.resolveKey(
        value,
        this.api.findStructuredTypeForType<T>(types[index])
      )
    );
    property.segment((s) => s.keys(keys));
    return property;
  }

  value() {
    return ODataValueResource.factory<T>(
      this.api,
      this.type(),
      this.cloneSegments(),
      this.cloneQuery<T>()
    );
  }

  /*
  navigationProperty<N>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.parserForType<N>(type);
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
      this.cloneQuery<N>()
    );
  }
  */

  property<P>(path: string) {
    let type = this.type();
    if (type !== undefined) {
      let parser = this.api.parserForType<P>(type);
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
      this.cloneQuery<P>()
    );
  }

  //#region Requests
  protected get(
    options: ODataEntityOptions & ODataEntitiesOptions & ODataPropertyOptions
  ): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Shortcuts
  /**
   * Fetch the property
   * @param options Options for the request
   * @return The entity / entities / property value
   */
  fetch(
    options?: ODataEntityOptions & { etag?: string }
  ): Observable<ODataEntity<T>>;
  fetch(options?: ODataEntitiesOptions): Observable<ODataEntities<T>>;
  fetch(options?: ODataPropertyOptions): Observable<ODataProperty<T>>;
  fetch(
    options: ODataEntityOptions &
      ODataEntitiesOptions &
      ODataPropertyOptions & { etag?: string } = {}
  ): Observable<any> {
    return this.get(options);
  }

  /**
   * Fetch the property value
   * @param options Options for the request
   * @returns The property value
   */
  fetchProperty(
    options: ODataOptions & { etag?: string } = {}
  ): Observable<T | null> {
    return this.fetch({ responseType: 'property', ...options }).pipe(
      map(({ property }) => property)
    );
  }

  /**
   * Fetch the entity
   * @param options Options for the request
   * @returns The entity
   */
  fetchEntity(
    options: ODataOptions & { etag?: string } = {}
  ): Observable<T | null> {
    return this.fetch({ responseType: 'entity', ...options }).pipe(
      map(({ entity }) => entity)
    );
  }

  /**
   * Fetch the entity and return as model
   * @param options Options for the request
   * @returns The model
   */
  fetchModel<M extends ODataModel<T>>(
    options: ODataOptions & { etag?: string } = {}
  ): Observable<M | null> {
    return this.fetch({ responseType: 'entity', ...options }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel<M>(entity, { annots, reset: true }) : null
      )
    );
  }

  /**
   * Fetch the entities
   * @param options Options for the request
   * @returns The entities
   */
  fetchEntities(
    options: ODataOptions & { withCount?: boolean } = {}
  ): Observable<T[] | null> {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities }) => entities)
    );
  }

  /**
   * Fetch the entities and return as collection
   * @param options Options for the request
   * @returns The collection
   */
  fetchCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    options: ODataOptions & { withCount?: boolean } = {}
  ): Observable<C | null> {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) =>
        entities
          ? this.asCollection<M, C>(entities, { annots, reset: true })
          : null
      )
    );
  }

  /**
   * Fetch all entities
   * @param options Options for the request
   * @returns All entities
   */
  fetchAll(options: ODataOptions = {}): Observable<T[]> {
    let res = this.clone();
    // Clean Paging
    res.query((q) => q.clearPaging());
    let fetch = (opts?: {
      skip?: number;
      skiptoken?: string;
      top?: number;
    }): Observable<ODataEntities<T>> => {
      if (opts) {
        res.query((q) => q.paging(opts));
      }
      return res.fetch({ responseType: 'entities', ...options });
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
