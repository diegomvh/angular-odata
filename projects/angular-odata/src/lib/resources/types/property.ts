import { EMPTY, Observable } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { PathSegment, QueryOption, StructuredTypeFieldConfig } from '../../types';
import { ODataPathSegments } from '../path';
import { ApplyExpression, ApplyExpressionBuilder } from '../query';
import { ODataResource } from '../resource';
import {
  ODataEntities,
  ODataEntity,
  ODataProperty,
} from '../response';
import {
  ODataEntitiesOptions,
  ODataEntityOptions,
  ODataOptions,
  ODataPropertyOptions,
} from './options';
import { ODataValueResource } from './value';
import { ODataCountResource } from './count';
import { ODataEntitiesAnnotations } from '../../annotations';

export class ODataPropertyResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<P>(
    api: ODataApi,
    {
      path,
      type,
      segments,
    }: {
      path: string;
      type?: string;
      segments: ODataPathSegments;
    }
  ) {
    const segment = segments.add(PathSegment.property, path);
    if (type !== undefined) {
      segment.outgoingType(type);
      segment.incomingType(type);
    }
    return new ODataPropertyResource<P>(api, {
      segments,
    });
  }

  static fromResource<N>(resource: ODataResource<any>, path: string) {
    const baseType = resource.outgoingType();
    let baseSchema = baseType !== undefined ? resource.api.structuredType<any>(baseType) : undefined;
    let fieldType: string | undefined;
    if (baseSchema !== undefined) {
      const field = baseSchema.field<N>(path);
      fieldType = field?.type;
      baseSchema =
        field !== undefined
          ? baseSchema.findParentSchemaForField<N>(field)
          : undefined;
    }

    const property = ODataPropertyResource.factory<N>(resource.api, {
      path,
      type: fieldType,
      segments: resource.cloneSegments(),
    });

    // Switch entitySet to binding type if available
    if (baseSchema !== undefined && baseSchema.type() !== baseType) {
      let entitySet = resource.api.findEntitySet(baseSchema.type());
      if (entitySet !== undefined) {
        property.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }

    return property;
  }
  override clone(): ODataPropertyResource<T> {
    return super.clone() as ODataPropertyResource<T>;
  }

  override transform<R>(
    opts: (
      builder: ApplyExpressionBuilder<T>,
      current?: ApplyExpression<T>
    ) => ApplyExpression<T>,
    {type, fields}: {type?: string, fields?: { [P in keyof R]?: StructuredTypeFieldConfig }} = {}): ODataPropertyResource<R> {
    return super.transform<R>(opts, {type, fields}) as ODataPropertyResource<R>;
  }
  //#endregion

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
        this.api.findStructuredType<T>(types[index])
      )
    );
    property.segment((s) => s.keys(keys));
    return property;
  }

  value() {
    return ODataValueResource.fromResource<T>(this);
  }

  count() {
    return ODataCountResource.factory<T>(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>()
    });
  }

  /*
  navigationProperty<N>(path: string) {
    let schema: ODataStructuredType<N> | undefined;
    if (this.schema instanceof ODataStructuredType) {
      const field = this.schema.field<any>(path as keyof T);
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
  */

  property<P>(path: string) {
    return ODataPropertyResource.fromResource<P>(this, path);
  }

  //#region Requests
  protected override get(
    options?: ODataEntityOptions & ODataEntitiesOptions & ODataPropertyOptions
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
  fetch(options?: ODataEntityOptions): Observable<ODataEntity<T>>;
  fetch(options?: ODataEntitiesOptions): Observable<ODataEntities<T>>;
  fetch(options?: ODataPropertyOptions): Observable<ODataProperty<T>>;
  fetch(
    options: ODataEntityOptions &
      ODataEntitiesOptions &
      ODataPropertyOptions = {}
  ): Observable<any> {
    return this.get(options);
  }

  /**
   * Fetch the property value
   * @param options Options for the request
   * @returns The property value
   */
  fetchProperty(options: ODataOptions = {}): Observable<T | null> {
    return this.fetch({ responseType: 'property', ...options }).pipe(
      map(({ property }) => property)
    );
  }

  /**
   * Fetch the entity
   * @param options Options for the request
   * @returns The entity
   */
  fetchEntity(options: ODataOptions = {}): Observable<T | null> {
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
      ModelType?: typeof ODataModel;
    } = {},
  ): Observable<M | null> {
    return this.fetch({ responseType: 'entity', ...options }).pipe(
      map(({ entity, annots }) =>
        entity ? this.asModel<M>(entity, { annots, ModelType: options?.ModelType }) : null
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
    options: ODataOptions & { withCount?: boolean, CollectionType?: typeof ODataCollection } = {}
  ): Observable<C | null> {
    return this.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) =>
        entities ? this.asCollection<M, C>(entities, { annots, CollectionType: options?.CollectionType }) : null
      )
    );
  }

  fetchOne(
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    }
  ): Observable<{ entity: T | null; annots: ODataEntitiesAnnotations<T> }> {
    let res = this.clone();
    res.query((q) => q.top(1));
    return res.fetch({ responseType: 'entities', ...options }).pipe(
      map(({ entities, annots }) => ({
        entity: entities !== null && entities.length === 1 ? entities[0] : null,
        annots,
      }))
    );
  }

  fetchMany(
    top: number,
    options?: ODataOptions & {
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    }
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
      expand(({ annots }) =>
        annots.skip || annots.skiptoken ? fetch(annots) : EMPTY
      ),
      map(({ entities, annots }) => ({ entities: entities || [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])],
        annots: acc.annots.union(annots),
      }))
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
    } = {}
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
      expand(({ annots }) =>
        annots.skip || annots.skiptoken ? fetch(annots) : EMPTY
      ),
      map(({ entities, annots }) => ({ entities: entities || [], annots })),
      reduce((acc, { entities, annots }) => ({
        entities: [...(acc.entities || []), ...(entities || [])],
        annots: acc.annots.union(annots),
      }))
    );
  }
  //#endregion
}
