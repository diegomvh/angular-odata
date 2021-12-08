import { EMPTY, Observable } from 'rxjs';
import { concatMap, expand, map, toArray } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { ODataStructuredType } from '../../schema';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntities, ODataEntity } from '../responses';
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
      schema,
      segments,
      query,
    }: {
      path: string;
      schema?: ODataStructuredType<N>;
      segments: ODataPathSegments;
      query?: ODataQueryOptions<N>;
    }
  ) {
    const baseType = segments.last()?.type();
    const bindingType = schema?.type();

    const segment = segments.add(PathSegmentNames.navigationProperty, path);
    if (schema !== undefined) segment.type(schema.type());
    query?.keep(QueryOptionNames.format);
    const navigation = new ODataNavigationPropertyResource<N>(api, {
      segments,
      query,
      schema,
    });

    // Switch entitySet to binding type if available
    if (bindingType !== undefined && bindingType !== baseType) {
      let entitySet = api.findEntitySetForType(bindingType);
      if (entitySet !== undefined) {
        navigation.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }
    return navigation;
  }
  //#endregion

  key(value: any) {
    const navigation = this.clone<ODataNavigationPropertyResource<T>>();
    var key = this.resolveKey(value);
    if (key !== undefined)
      navigation.segment((s) => s.navigationProperty().key(key));
    return navigation;
  }

  keys(values: any[]) {
    const navigation = this.clone<ODataNavigationPropertyResource<T>>();
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
    let schema: ODataStructuredType<N> | undefined;
    if (this.schema instanceof ODataStructuredType) {
      const field = this.schema.findFieldByName<any>(path as keyof T);
      schema =
        field !== undefined
          ? this.schema.findSchemaForField<N>(field)
          : undefined;
    }
    return ODataNavigationPropertyResource.factory<N>(this.api, {
      path,
      schema,
      segments: this.cloneSegments(),
      query: this.cloneQuery<N>(),
    });
  }

  property<P>(path: string) {
    let schema: ODataStructuredType<P> | undefined;
    if (this.schema instanceof ODataStructuredType) {
      const field = this.schema.findFieldByName<any>(path as keyof T);
      schema =
        field !== undefined
          ? this.schema.findSchemaForField<P>(field)
          : undefined;
    }
    return ODataPropertyResource.factory<P>(this.api, {
      path,
      schema,
      segments: this.cloneSegments(),
      query: this.cloneQuery<P>(),
    });
  }

  count() {
    return ODataCountResource.factory<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }

  cast<C>(type: string) {
    //TODO: Resolve schema
    const segments = this.cloneSegments();
    segments.add(PathSegmentNames.type, type).type(type);
    return new ODataNavigationPropertyResource<C>(this.api, {
      segments,
      query: this.cloneQuery<C>(),
    });
  }

  //#region Requests
  protected post(
    attrs: Partial<T>,
    options: ODataOptions = {}
  ): Observable<ODataEntity<T>> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected put(
    attrs: Partial<T>,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<ODataEntity<T>> {
    return super.put(attrs, { responseType: 'entity', ...options });
  }

  protected patch(
    attrs: Partial<T>,
    options: ODataOptions & { etag?: string } = {}
  ): Observable<ODataEntity<T>> {
    return super.patch(attrs, { responseType: 'entity', ...options });
  }

  protected delete(
    options: ODataOptions & { etag?: string } = {}
  ): Observable<any> {
    return super.delete({ responseType: 'entity', ...options });
  }

  protected get(
    options: ODataEntityOptions &
      ODataEntitiesOptions & {
        etag?: string;
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
   * @param etag The etag of the entity
   * @returns The updated entity with the annotations
   */
  update(
    attrs: Partial<T>,
    options?: ODataOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    return this.put(attrs, options);
  }

  /**
   * Modify an existing entity
   * @param attrs The entity attributes
   * @param options Options for the request
   * @param etag The etag of the entity
   * @returns The modified entity with the annotations
   */
  modify(
    attrs: Partial<T>,
    options?: ODataOptions & { etag?: string }
  ): Observable<ODataEntity<T>> {
    return this.patch(attrs, options);
  }

  /**
   * Delete an existing entity
   * @param options Options for the request
   * @param etag The etag of the entity
   * @returns An observable of the destroy
   */
  destroy(options?: ODataOptions & { etag?: string }): Observable<any> {
    return this.delete(options);
  }

  /**
   * Fetch entity / entities
   * @param options Options for the request
   * @return An observable of the entity or entities with annotations
   */
  fetch(
    options?: ODataEntityOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntity<T>>;
  fetch(
    options?: ODataEntitiesOptions & {
      etag?: string;
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<ODataEntities<T>>;
  fetch(
    options: ODataEntityOptions &
      ODataEntitiesOptions & {
        etag?: string;
        bodyQueryOptions?: QueryOptionNames[];
      } = {}
  ): Observable<any> {
    return this.get(options);
  }

  /**
   * Fetch the entity
   * @param options Options for the request
   * @returns The entity
   */
  fetchEntity(
    options: ODataOptions & {
      etag?: string;
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
      etag?: string;
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

  /**
   * Fetch all entities
   * @param options Options for the request
   * @returns All entities
   */
  fetchAll(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOptionNames[];
    } = {}
  ): Observable<T[]> {
    let res = this.clone<ODataNavigationPropertyResource<T>>();
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
