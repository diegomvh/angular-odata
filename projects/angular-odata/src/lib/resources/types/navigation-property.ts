import { EMPTY, Observable, throwError } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { ODataApi } from '../../api';
import type { ModelInterface, ODataCollection, ODataModel } from '../../models';
import { PathSegment, QueryOption, ODataStructuredTypeFieldConfig } from '../../types';
import { ODataPathSegments } from '../path';
import { ApplyExpression, ApplyExpressionBuilder } from '../query';
import { ODataResource } from '../resource';
import { ODataEntities, ODataEntity } from '../response';
import { ODataCountResource } from './count';
import { ODataMediaResource } from './media';
import { ODataEntitiesOptions, ODataEntityOptions, ODataOptions } from './options';
import { ODataPropertyResource } from './property';
import { ODataReferenceResource } from './reference';
import { ODataEntitiesAnnotations } from '../../annotations';

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
      segments,
    }: {
      path: string;
      type?: string;
      segments: ODataPathSegments;
    },
  ) {
    const segment = segments.add(PathSegment.navigationProperty, path);
    if (type !== undefined) {
      segment.outgoingType(type);
      segment.incomingType(type);
    }
    return new ODataNavigationPropertyResource<N>(api, {
      segments,
    });
  }

  static fromResource<N>(resource: ODataResource<any>, path: string) {
    const baseType = resource.outgoingType();
    let baseSchema =
      baseType !== undefined ? resource.api.structuredType<any>(baseType) : undefined;
    let fieldType: string | undefined;
    if (baseSchema !== undefined) {
      const field = baseSchema.field<N>(path);
      fieldType = field?.type;
      baseSchema = field !== undefined ? baseSchema.findParentSchemaForField<N>(field) : undefined;
    }

    const navigation = ODataNavigationPropertyResource.factory<N>(resource.api, {
      path,
      type: fieldType,
      segments: resource.cloneSegments(),
    });

    // Switch entitySet to binding type if available
    if (baseSchema !== undefined && baseSchema.type() !== baseType) {
      let entitySet = resource.api.findEntitySet(baseSchema.type());
      if (entitySet !== undefined) {
        navigation.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }

    return navigation;
  }

  override clone(): ODataNavigationPropertyResource<T> {
    return super.clone() as ODataNavigationPropertyResource<T>;
  }

  override transform<R>(
    opts: (builder: ApplyExpressionBuilder<T>, current?: ApplyExpression<T>) => ApplyExpression<T>,
    {
      type,
      fields,
    }: {
      type?: string;
      fields?: { [name: string]: ODataStructuredTypeFieldConfig };
    } = {},
  ): ODataNavigationPropertyResource<R> {
    return super.transform<R>(opts, {
      type,
      fields,
    }) as ODataNavigationPropertyResource<R>;
  }
  //#endregion

  key(value: any) {
    const navigation = this.clone();
    var key = this.resolveKey(value);
    if (key !== undefined) navigation.segment((s) => s.navigationProperty().key(key));
    return navigation;
  }

  keys(values: any[]) {
    const navigation = this.clone();
    const types = this.pathSegments.types({ key: true });
    const keys = values.map((value, index) =>
      ODataResource.resolveKey<T>(value, this.api.findStructuredType<T>(types[index])),
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
    const thisType = this.incomingType();
    const baseSchema = thisType !== undefined ? this.api.structuredType(thisType) : undefined;
    const castSchema = this.api.findStructuredType<C>(type);
    if (castSchema !== undefined && baseSchema !== undefined && !castSchema.isSubtypeOf(baseSchema))
      throw new Error(`Cannot cast to ${type}`);
    const segments = this.cloneSegments();
    segments.add(PathSegment.type, type).incomingType(type);
    return new ODataNavigationPropertyResource<C>(this.api, {
      segments,
      query: this.cloneQuery<C>(),
    });
  }

  //#region Requests
  protected override post(attrs: Partial<T>, options: ODataOptions = {}): Observable<any> {
    return super.post(attrs, { responseType: 'entity', ...options });
  }

  protected override put(attrs: Partial<T>, options: ODataOptions = {}): Observable<any> {
    return super.put(attrs, { responseType: 'entity', ...options });
  }

  protected override patch(attrs: Partial<T>, options: ODataOptions = {}): Observable<any> {
    return super.patch(attrs, { responseType: 'entity', ...options });
  }

  protected override delete(options: ODataOptions = {}): Observable<any> {
    return super.delete({ responseType: 'entity', ...options });
  }

  protected override get(
    options: ODataEntityOptions &
      ODataEntitiesOptions & {
        bodyQueryOptions?: QueryOption[];
      } = {},
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
  create(attrs: Partial<T>, options?: ODataOptions): Observable<ODataEntity<T>> {
    return this.post(attrs, options);
  }

  /**
   * Update an existing entity
   * @param attrs The entity attributes
   * @param options Options for the request
   * @returns The updated entity with the annotations
   */
  update(attrs: Partial<T>, options?: ODataOptions): Observable<ODataEntity<T>> {
    return this.put(attrs, options);
  }

  /**
   * Modify an existing entity
   * @param attrs The entity attributes
   * @param options Options for the request
   * @returns The modified entity with the annotations
   */
  modify(attrs: Partial<T>, options?: ODataOptions): Observable<ODataEntity<T>> {
    return this.patch(attrs, options);
  }

  /**
   * Delete an existing entity
   * @param options Options for the request
   * @returns An observable of the destroy
   */
  destroy(options?: ODataOptions): Observable<ODataEntity<T>> {
    return this.delete(options);
  }

  /**
   * Fetch entity / entities
   * @param options Options for the request
   * @return An observable of the entity or entities with annotations
   */
  fetch(
    options?: ODataEntityOptions & {
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<ODataEntity<T>>;
  fetch(
    options?: ODataEntitiesOptions & {
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<ODataEntities<T>>;
  fetch(
    options: ODataEntityOptions &
      ODataEntitiesOptions & {
        bodyQueryOptions?: QueryOption[];
      } = {},
  ): Observable<any> {
    if (!this.hasEntityKey())
      return throwError(() => new Error('fetch: Navigation resource without entity key'));
    return this.get(options);
  }

  /**
   * Fetch the entity
   * @param options Options for the request
   * @returns The entity
   */
  fetchEntity(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
    } = {},
  ): Observable<T | null> {
    return this.fetch({ responseType: 'entity', ...options }).pipe(map(({ entity }) => entity));
  }

  /**
   * Fetch the entity and return as model
   * @param options Options for the request
   * @returns The model
   */
  fetchModel(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
      ModelType?: typeof ODataModel;
    },
  ): Observable<(ODataModel<T> & ModelInterface<T>) | null>;
  fetchModel<M extends ODataModel<T>>(
    options?: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
      ModelType?: typeof ODataModel;
    },
  ): Observable<M | null>;
  fetchModel(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
      ModelType?: typeof ODataModel;
    } = {},
  ) {
    return this.fetch({ responseType: 'entity', ...options }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel(entity, { annots, ModelType: options?.ModelType }) : null,
      ),
    );
  }

  /**
   * Fetch entities
   * @param options Options for the request
   * @returns The entities
   */
  fetchEntities(
    options: ODataOptions & {
      bodyQueryOptions?: QueryOption[];
    } = {},
  ): Observable<T[] | null> {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities }) => entities),
    );
  }

  /**
   * Fetch entities and return as collection
   * @param options Options for the request
   * @returns The collection
   */
  fetchCollection(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
      CollectionType?: typeof ODataCollection;
    },
  ): Observable<ODataCollection<T, ODataModel<T> & ModelInterface<T>> | null>;
  fetchCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
      CollectionType?: typeof ODataCollection;
    },
  ): Observable<C | null>;
  fetchCollection(
    options: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
      CollectionType?: typeof ODataCollection;
    } = {},
  ) {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) =>
        entities
          ? this.asCollection(entities, {
              annots,
              CollectionType: options?.CollectionType,
            })
          : null,
      ),
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
      bodyQueryOptions?: QueryOption[];
    } = {},
  ): Observable<{ entities: T[]; annots: ODataEntitiesAnnotations<T> }> {
    let res = this.clone();
    // Clean Paging
    res.query((q) => q.removePaging());
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
      expand(({ annots }) => (annots.skip || annots.skiptoken ? fetch(annots) : EMPTY)),
      map(({ entities, annots }) => ({ entities: entities || [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])],
        annots: acc.annots.union(annots),
      })),
    );
  }
  //#endregion

  fetchMany(
    top: number,
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<{ entities: T[]; annots: ODataEntitiesAnnotations<T> }> {
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
    return fetch({ top }).pipe(
      expand(({ annots }) => (annots.skip || annots.skiptoken ? fetch(annots) : EMPTY)),
      map(({ entities, annots }) => ({ entities: entities || [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])],
        annots: acc.annots.union(annots),
      })),
    );
  }

  fetchOne(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<{ entity: T | null; annots: ODataEntitiesAnnotations<T> }> {
    const res = this.clone();
    res.query((q) => q.top(1));
    return res.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) => ({
        entity: entities !== null && entities.length === 1 ? entities[0] : null,
        annots,
      })),
    );
  }
}
