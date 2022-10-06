import { EMPTY, Observable, throwError } from 'rxjs';
import { concatMap, expand, map, reduce, toArray } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { ODataStructuredType } from '../../schema';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntities, ODataEntitiesAnnotations, ODataEntity } from '../responses';
import { ODataCountResource } from './count';
import { ODataMediaResource } from './media';
import {
  ODataEntitiesOptions,
  ODataEntityOptions,
  ODataOptions,
} from './options';
import { ODataPropertyResource } from './property';
import { ODataReferenceResource } from './reference';

/**
 * OData Navigation Property Resource
 * https://www.odata.org/getting-started/advanced-tutorial/#containment
 * https://www.odata.org/getting-started/advanced-tutorial/#derived
 */
export class ODataNavigationPropertyResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<N>(
    api: ODataApi,
    {
      path,
      type,
      schema,
      segments,
      query,
    }: {
      path: string;
      type?: string;
      schema?: ODataStructuredType<N>;
      segments: ODataPathSegments;
      query?: ODataQueryOptions<N>;
    }
  ) {
    const segment = segments.add(PathSegmentNames.navigationProperty, path);
    if (schema !== undefined) segment.type(schema.type());
    else if (type !== undefined) segment.type(type);
    query?.keep(QueryOptionNames.format);
    return new ODataNavigationPropertyResource<N>(api, {
      segments,
      query,
      schema,
    });
  }

  static fromResource<N>(resource: ODataResource<any>, path: string) {
    const baseType = resource.type();
    let baseSchema = resource.schema as ODataStructuredType<any> | undefined;
    let fieldType: string | undefined;
    let fieldSchema: ODataStructuredType<N> | undefined;
    if (baseSchema !== undefined) {
      const field = baseSchema.field<N>(path);
      fieldType = field?.type;
      fieldSchema =
        fieldType !== undefined
          ? resource.api.findStructuredTypeForType(fieldType)
          : undefined;
      baseSchema =
        field !== undefined
          ? baseSchema.findSchemaForField<N>(field)
          : undefined;
    }

    const navigation = ODataNavigationPropertyResource.factory<N>(
      resource.api,
      {
        path,
        type: fieldType,
        schema: fieldSchema,
        segments: resource.cloneSegments(),
        query: resource.cloneQuery<N>(),
      }
    );

    // Switch entitySet to binding type if available
    if (baseSchema !== undefined && baseSchema.type() !== baseType) {
      let entitySet = resource.api.findEntitySetForType(baseSchema.type());
      if (entitySet !== undefined) {
        navigation.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }

    return navigation;
  }
  override clone(): ODataNavigationPropertyResource<T> {
    return super.clone() as ODataNavigationPropertyResource<T>;
  }
  //#endregion

  key(value: any) {
    const navigation = this.clone();
    var key = this.resolveKey(value);
    if (key !== undefined)
      navigation.segment((s) => s.navigationProperty().key(key));
    return navigation;
  }

  keys(values: any[]) {
    const navigation = this.clone();
    const types = this.pathSegments.types({ key: true });
    const keys = values.map((value, index) =>
      ODataResource.resolveKey(
        value,
        this.api.findStructuredTypeForType<T>(types[index])
      )
    );
    navigation.segment((s) => s.keys(keys));
    return navigation;
  }

  media() {
    return ODataMediaResource.factory<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }

  reference() {
    return ODataReferenceResource.factory<T>(this.api, {
      segments: this.cloneSegments(),
    });
  }

  navigationProperty<N>(path: string) {
    return ODataNavigationPropertyResource.fromResource<N>(this, path);
  }

  property<P>(path: string) {
    return ODataPropertyResource.fromResource<P>(this, path);
  }

  count() {
    return ODataCountResource.factory<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }

  cast<C>(type: string) {
    const baseSchema = this.schema as ODataStructuredType<T>;
    const castSchema = this.api.findStructuredTypeForType<C>(type);
    if (
      castSchema !== undefined &&
      baseSchema !== undefined &&
      !castSchema.isSubtypeOf(baseSchema)
    )
      throw new Error(`Cannot cast to ${type}`);
    const segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataNavigationPropertyResource<C>(this.api, {
      segments,
      schema: castSchema,
      query: this.cloneQuery<C>(),
    });
  }

  //#region Requests
  protected override post(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<ODataEntity<T>> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected override put(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<ODataEntity<T>> {
    return super.put(attrs, { responseType: 'entity', ...options });
  }

  protected override patch(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<ODataEntity<T>> {
    return super.patch(attrs, { responseType: 'entity', ...options });
  }

  protected override delete(options: ODataOptions = {}): Observable<any> {
    return super.delete({ responseType: 'entity', ...options });
  }

  protected override get(
    options: ODataEntityOptions &
      ODataEntitiesOptions & {
        bodyQueryOptions?: QueryOptionNames[];
      } = {}
  ): Observable<any> {
    return super.get(options);
  }

  //#endregion

  //#region Shortcuts
  /**
   * Create a new entity
   * @param attrs The entity attributes
   * @param options Options for the request
   * @returns The created entity with the annotations
   */
  create(
    attrs: Partial<T>,
    options?: ODataOptions
  ): Observable<ODataEntity<T>> {
    return this.post(attrs, options);
  }

  /**
   * Update an existing entity
   * @param attrs The entity attributes
   * @param options Options for the request
   * @returns The updated entity with the annotations
   */
  update(
    attrs: Partial<T>,
    options?: ODataOptions
  ): Observable<ODataEntity<T>> {
    return this.put(attrs, options);
  }

  /**
   * Modify an existing entity
   * @param attrs The entity attributes
   * @param options Options for the request
   * @returns The modified entity with the annotations
   */
  modify(
    attrs: Partial<T>,
    options?: ODataOptions
  ): Observable<ODataEntity<T>> {
    return this.patch(attrs, options);
  }

  /**
   * Delete an existing entity
   * @param options Options for the request
   * @returns An observable of the destroy
   */
  destroy(options?: ODataOptions): Observable<any> {
    return this.delete(options);
  }

  /**
   * Fetch entity / entities
   * @param options Options for the request
   * @return An observable of the entity or entities with annotations
   */
  fetch(
    options?: ODataEntityOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntity<T>>;
  fetch(
    options?: ODataEntitiesOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntities<T>>;
  fetch(
    options: ODataEntityOptions &
      ODataEntitiesOptions & {
        bodyQueryOptions?: QueryOptionNames[];
      } = {}
  ): Observable<any> {
    if (!this.hasEntityKey())
      return throwError(
        () => new Error('fetch: Navigation resource without entity key')
      );
    return this.get(options);
  }

  /**
   * Fetch the entity
   * @param options Options for the request
   * @returns The entity
   */
  fetchEntity(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
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
    options: ODataOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<M | null> {
    return this.fetch({ responseType: 'entity', ...options }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel<M>(entity, { annots, reset: true }) : null
      )
    );
  }

  /**
   * Fetch entities
   * @param options Options for the request
   * @returns The entities
   */
  fetchEntities(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<T[] | null> {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities }) => entities)
    );
  }

  /**
   * Fetch entities and return as collection
   * @param options Options for the request
   * @returns The collection
   */
  fetchCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    options: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<C | null> {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) =>
        entities
          ? this.asCollection<M, C>(entities, { annots, reset: true })
          : null
      )
    );
  }

  fetchOne(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<{entity: T | null, annots: ODataEntitiesAnnotations<T>}> {
    let res = this.clone();
    res.query((q) => q.top(1));
    return res.fetch({ responseType: 'entities', ...options }).pipe(
      map(({entities, annots}) => ({entity: entities !== null ? entities[0] || null : null, annots}))
    );
  }

  fetchMany(
    top: number,
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<{entities: T[], annots: ODataEntitiesAnnotations<T>}> {
    let res = this.clone();
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
    return fetch({top}).pipe(
      expand(({ annots }) =>
        annots.skip || annots.skiptoken ? fetch(annots) : EMPTY
      ),
      map(({ entities, annots }) => ({entities: entities || [], annots})),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])], 
        annots: acc.annots.union(annots)})),
    );
  }

  /**
   * Fetch all entities
   * @param options Options for the request
   * @returns All entities
   */
  fetchAll(
    options: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<{entities: T[], annots: ODataEntitiesAnnotations<T>}> {
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
      expand(({ annots }) =>
        annots.skip || annots.skiptoken ? fetch(annots) : EMPTY
      ),
      map(({ entities, annots }) => ({entities: entities || [], annots})),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])], 
        annots: acc.annots.union(annots)})),
    );
  }
  //#endregion
}
