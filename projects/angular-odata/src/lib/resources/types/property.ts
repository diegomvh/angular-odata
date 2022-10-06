import { EMPTY, Observable } from 'rxjs';
import { concatMap, expand, map, reduce, toArray } from 'rxjs/operators';
import { ODataApi } from '../../api';
import { ODataCollection, ODataModel } from '../../models';
import { ODataStructuredType } from '../../schema';
import { PathSegmentNames, QueryOptionNames } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataEntities, ODataEntitiesAnnotations, ODataEntity, ODataProperty } from '../responses';
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
    {
      path,
      type,
      schema,
      segments,
      query,
    }: {
      path: string;
      type?: string;
      schema?: ODataStructuredType<P>;
      segments: ODataPathSegments;
      query?: ODataQueryOptions<P>;
    }
  ) {
    const segment = segments.add(PathSegmentNames.property, path);
    if (schema !== undefined) segment.type(schema.type());
    else if (type !== undefined) segment.type(type);

    query?.clear();
    return new ODataPropertyResource<P>(api, {
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

    const property = ODataPropertyResource.factory<N>(resource.api, {
      path,
      type: fieldType,
      schema: fieldSchema,
      segments: resource.cloneSegments(),
      query: resource.cloneQuery<N>(),
    });

    // Switch entitySet to binding type if available
    if (baseSchema !== undefined && baseSchema.type() !== baseType) {
      let entitySet = resource.api.findEntitySetForType(baseSchema.type());
      if (entitySet !== undefined) {
        property.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }

    return property;
  }
  override clone(): ODataPropertyResource<T> {
    return super.clone() as ODataPropertyResource<T>;
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
        this.api.findStructuredTypeForType<T>(types[index])
      )
    );
    property.segment((s) => s.keys(keys));
    return property;
  }

  value() {
    return ODataValueResource.factory<T>(this.api, {
      type: this.returnType(),
      schema: this.schema as ODataStructuredType<T>,
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
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
    let type: string | undefined;
    let schema: ODataStructuredType<P> | undefined;
    if (this.schema instanceof ODataStructuredType) {
      const field = this.schema.field<any>(path as keyof T);
      type = field?.type;
      schema =
        field !== undefined
          ? this.schema.findSchemaForField<P>(field)
          : undefined;
    }
    return ODataPropertyResource.factory<P>(this.api, {
      path,
      type,
      schema,
      segments: this.cloneSegments(),
      query: this.cloneQuery<P>(),
    });
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
    options: ODataOptions = {}
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
