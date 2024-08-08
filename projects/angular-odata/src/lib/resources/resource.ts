import { Observable } from 'rxjs';
import { ODataApi } from '../api';
import {
  DEFAULT_VERSION,
  PARAM_SEPARATOR,
  QUERY_SEPARATOR,
  VALUE_SEPARATOR,
} from '../constants';
import { ODataHelper } from '../helper';
import { ModelInterface, ODataCollection, ODataModel } from '../models';
import { ODataStructuredType } from '../schema';
import {
  ParserOptions,
  Parser,
  QueryOption,
  PathSegment,
  StructuredTypeFieldConfig,
} from '../types';
import { Objects, Strings, Types } from '../utils';
import { ODataPathSegments, ODataPathSegmentsHandler } from './path';
import {
  isQueryCustomType,
  ODataQueryOptions,
  ODataQueryOptionsHandler,
} from './query';
import {
  ApplyExpression,
  ApplyExpressionBuilder,
  QueryCustomType,
} from './query';
import { ODataOptions } from './types';
import {
  ODataEntitiesAnnotations,
  ODataEntityAnnotations,
} from '../annotations';

export type EntityKey<T> =
  | {
    readonly [P in keyof T]?: T[P];
  }
  | QueryCustomType
  | string
  | number;

export class ODataResource<T> {
  // VARIABLES
  public api: ODataApi;
  protected pathSegments: ODataPathSegments;
  protected queryOptions: ODataQueryOptions<T>;
  constructor(
    api: ODataApi,
    {
      segments,
      query,
    }: {
      segments?: ODataPathSegments;
      query?: ODataQueryOptions<T>;
    } = {},
  ) {
    this.api = api;
    this.pathSegments = segments ?? new ODataPathSegments();
    this.queryOptions = query ?? new ODataQueryOptions();
  }

  /**
   * @returns string The outgoing type of the resource
   */
  outgoingType() {
    return this.pathSegments.last()?.outgoingType();
  }

  /**
   * @returns string The incoming type of the resource
   */
  incomingType() {
    return this.pathSegments.last()?.incomingType();
  }

  /**
   * @returns string The binding type of the resource
   */
  bindingType() {
    return this.pathSegments.last()?.bindingType();
  }

  /**
   * @returns string All covered types of the resource
   */
  types(): string[] {
    return this.pathSegments.types();
  }

  callable() {
    const type = this.outgoingType() ?? this.incomingType();
    return type !== undefined ? this.api.callable<T>(type) : undefined;
  }

  enumType() {
    const type = this.outgoingType() ?? this.incomingType();
    return type !== undefined ? this.api.enumType<T>(type) : undefined;
  }

  structuredType() {
    const type = this.outgoingType() ?? this.incomingType();
    return type !== undefined ? this.api.structuredType<T>(type) : undefined;
  }

  /**
   * @returns boolean The resource has key ?
   */
  hasKey() {
    return Boolean(this.pathSegments.last({ key: true })?.hasKey());
  }

  hasEntityKey() {
    return Boolean(this.pathSegments.get(PathSegment.entitySet)?.hasKey());
  }

  clearKey() {
    return this.pathSegments.last({ key: true })?.clearKey();
  }

  //#region Models
  asModel(
    entity?: Partial<T> | { [name: string]: any }
  ): ODataModel<T> & ModelInterface<T>;
  asModel(
    entity: Partial<T> | { [name: string]: any },
    { annots, ModelType }: { annots?: ODataEntityAnnotations<T>; ModelType?: typeof ODataModel; },
  ): ODataModel<T> & ModelInterface<T>;
  asModel<M extends ODataModel<T>>(
    entity?: Partial<T> | { [name: string]: any },
  ): M;
  asModel<M extends ODataModel<T>>(
    entity: Partial<T> | { [name: string]: any },
    { annots, ModelType }: { annots?: ODataEntityAnnotations<T>; ModelType?: typeof ODataModel; },
  ): M;
  asModel(
    entity?: Partial<T> | { [name: string]: any },
    { annots, ModelType }: { annots?: ODataEntityAnnotations<T>; ModelType?: typeof ODataModel; } = {},
  ) {
    const reset = annots !== undefined;
    let resource: ODataResource<T> = this as ODataResource<T>;
    const type = annots?.type ?? this.incomingType();
    if (type === undefined) throw Error(`No type for model`);
    if (ModelType === undefined) ModelType = this.api.modelForType(type);
    let entitySet = annots?.entitySet;
    if (entitySet !== undefined) {
      resource = this.api.entitySet<T>(entitySet).entity(entity as Partial<T>);
      resource.query((q) => q.restore(this.queryOptions.toQueryArguments()));
    }
    return new ModelType(entity, { resource, annots, reset });
  }

  asCollection(
    entities?: Partial<T>[] | { [name: string]: any }[],
  ): ODataCollection<T, ODataModel<T> & ModelInterface<T>>;
  asCollection(
    entities: Partial<T>[] | { [name: string]: any }[],
    { annots, CollectionType }: { annots?: ODataEntitiesAnnotations<T>; CollectionType?: typeof ODataCollection; }
  ): ODataCollection<T, ODataModel<T> & ModelInterface<T>>;
  asCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    entities?: Partial<T>[] | { [name: string]: any }[],
  ): C;
  asCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    entities: Partial<T>[] | { [name: string]: any }[],
    { annots, CollectionType }: { annots?: ODataEntitiesAnnotations<T>; CollectionType?: typeof ODataCollection; },
  ): C;
  asCollection(
    entities?: Partial<T>[] | { [name: string]: any }[],
    { annots, CollectionType }: { annots?: ODataEntitiesAnnotations<T>; CollectionType?: typeof ODataCollection; } = {},
  ) {
    const reset = annots !== undefined;
    let resource: ODataResource<T> = this as ODataResource<T>;
    const type = annots?.type ?? this.incomingType();
    if (type === undefined) throw Error(`No type for collection`);
    if (CollectionType === undefined)
      CollectionType = this.api.collectionForType(type);
    let entitySet = annots?.entitySet;
    if (entitySet !== undefined) {
      resource = this.api.entitySet<T>(entitySet);
      resource.query((q) => q.restore(this.queryOptions.toQueryArguments()));
    }
    return new CollectionType(entities, { resource, annots, reset });
  }
  //#endregion

  isTypeOf(other: ODataResource<any>) {
    const thisStructured = this.structuredType();
    const otherStructured = other.structuredType();
    return (
      thisStructured !== undefined &&
      otherStructured !== undefined &&
      thisStructured.isTypeOf(otherStructured)
    );
  }

  isSubtypeOf(other: ODataResource<any>) {
    const thisStructured = this.structuredType();
    const otherStructured = other.structuredType();
    return (
      thisStructured !== undefined &&
      otherStructured !== undefined &&
      thisStructured.isSubtypeOf(otherStructured)
    );
  }

  isSupertypeOf(other: ODataResource<any>) {
    const thisStructured = this.structuredType();
    const otherStructured = other.structuredType();
    return (
      thisStructured !== undefined &&
      otherStructured !== undefined &&
      thisStructured.isSupertypeOf(otherStructured)
    );
  }

  isEqualTo(other: ODataResource<any>, test?: 'path' | 'params') {
    const [selfPath, selfParams] = this.pathAndParams();
    const [otherPath, otherParams] = other.pathAndParams();
    return test === 'path'
      ? otherPath === selfPath
      : test === 'params'
        ? Types.isEqual(selfParams, otherParams)
        : otherPath === selfPath && Types.isEqual(selfParams, otherParams);
  }

  pathAndParams(
    { escape, ...options }: ParserOptions & { escape?: boolean } = {
      escape: false,
    },
  ): [string, { [name: string]: any }] {
    const type = this.outgoingType();
    const parser =
      type !== undefined ? this.api.parserForType<T>(type) : undefined;
    const [spath, sparams] = this.pathSegments.pathAndParams({
      escape,
      parser,
      options,
    });
    const [, qparams] = this.queryOptions.pathAndParams({
      escape,
      parser,
      options,
    });

    return [spath, { ...sparams, ...qparams }];
  }

  endpointUrl({
    escape = false,
    params = true,
    ...options
  }: ParserOptions & { escape?: boolean; params?: boolean } = {}): string {
    let [path, qparams] = this.pathAndParams({ escape, ...options });
    if (params && !Types.isEmpty(qparams)) {
      path = `${path}${QUERY_SEPARATOR}${Object.entries(qparams)
        .map((e) => `${e[0]}${VALUE_SEPARATOR}${e[1]}`)
        .join(PARAM_SEPARATOR)}`;
    }
    return `${this.api.serviceRootUrl}${path}`;
  }

  toString(
    { escape, ...options }: ParserOptions & { escape?: boolean } = {
      escape: false,
    },
  ): string {
    let [path, params] = this.pathAndParams({ escape, ...options });
    let queryString = Object.entries(params)
      .map((e) => `${e[0]}${VALUE_SEPARATOR}${e[1]}`)
      .join(PARAM_SEPARATOR);
    return queryString ? `${path}${QUERY_SEPARATOR}${queryString}` : path;
  }

  clone(): ODataResource<T> {
    const Ctor = this.constructor as typeof ODataResource;
    return new Ctor(this.api, {
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }

  private __parser(
    value: any,
    options?: ParserOptions,
    resourceType?: string,
    bindingType?: string,
  ): Parser<T> | undefined {
    const dataType =
      options !== undefined && Types.isPlainObject(value)
        ? ODataHelper[options.version ?? DEFAULT_VERSION].type(value)
        : undefined;
    if (dataType !== undefined) {
      // Parser from data type
      return this.api.parserForType<T>(dataType);
    } else if (resourceType !== undefined) {
      // Parser from resource type
      return this.api.parserForType<T>(resourceType, bindingType);
    }
    return undefined;
  }

  deserialize(value: any, options?: ParserOptions): any {
    const resourceType = this.incomingType();
    const bindingType = this.bindingType();
    const _d = (value: any, options?: ParserOptions) => {
      const parser = this.__parser(value, options, resourceType, bindingType);
      return parser !== undefined ? parser.deserialize(value, options) : value;
    };
    return Array.isArray(value)
      ? value.map((v) => _d(v, options))
      : _d(value, options);
  }

  serialize(value: any, options?: ParserOptions): any {
    const resourceType = this.outgoingType();
    const bindingType = this.bindingType();
    const _s = (value: any, options?: ParserOptions) => {
      const parser = this.__parser(value, options, resourceType, bindingType);
      return parser !== undefined ? parser.serialize(value, options) : value;
    };
    return Array.isArray(value)
      ? value.map((v) => _s(v, options))
      : _s(value, options);
  }

  encode(value: any, options?: ParserOptions): any {
    const resourceType = this.outgoingType();
    const bindingType = this.bindingType();
    const _e = (value: any, options?: ParserOptions) => {
      const parser = this.__parser(value, options, resourceType, bindingType);
      return parser !== undefined ? parser.encode(value, options) : value;
    };
    return Array.isArray(value)
      ? value.map((v) => _e(v, options))
      : _e(value, options);
  }

  toJson() {
    return {
      segments: this.pathSegments.toJson(),
      options: this.queryOptions.toJson(),
    };
  }

  cloneSegments() {
    return this.pathSegments.clone();
  }

  //#region Query Options
  clearQuery() {
    this.queryOptions.clear();
    return this;
  }

  cloneQuery<P>() {
    return this.queryOptions.clone<P>();
  }

  /**
   * Handle the path segments of the resource
   * Create an object handler for mutate the path segments of the resource
   * @param f Function context for handle the segments
   * @returns ODataActionResource
   */
  segment(
    f: (q: ODataPathSegmentsHandler<T>, s?: ODataStructuredType<T>) => void,
  ) {
    const type = this.outgoingType();
    f(
      new ODataPathSegmentsHandler<T>(this.pathSegments),
      type !== undefined ? this.api.structuredType<T>(type) : undefined,
    );
    return this;
  }

  /**
   * Handle the query options of the resource
   * Create an object handler for mutate the query options of the resource
   * @param f Function context for handle the query options
   */
  query(
    f: (q: ODataQueryOptionsHandler<T>, s?: ODataStructuredType<T>) => void,
  ) {
    const type = this.outgoingType();
    f(
      new ODataQueryOptionsHandler<T>(this.queryOptions),
      type !== undefined ? this.api.structuredType<T>(type) : undefined,
    );
    return this;
  }

  transform<R>(
    opts: (
      builder: ApplyExpressionBuilder<T>,
      current?: ApplyExpression<T>,
    ) => ApplyExpression<T>,
    {
      type,
      fields,
    }: {
      type?: string;
      fields?: { [name: string]: StructuredTypeFieldConfig };
    } = {},
  ): ODataResource<R> {
    if (type === undefined) {
      type = Strings.uniqueId({ prefix: 'Transformation', suffix: 'Type' });
    }

    // Resolve Structured Type
    let structuredType = this.api.findStructuredType<R>(type);
    if (structuredType === undefined) {
      // Resolve Schema
      let schema = this.api.findSchema(type);
      if (schema === undefined) {
        const namespace =
          type.substring(0, type.lastIndexOf('.')) ?? this.api.name!;
        schema = this.api.createSchema({ namespace });
      }
      const name = type.substring(type.lastIndexOf('.'));
      structuredType = schema.createStructuredType({ name, fields });
    }

    // Segments
    const segments = this.cloneSegments();
    segments.last()?.incomingType(structuredType.type());

    // Query
    const query = this.cloneQuery<any>();
    const handler = new ODataQueryOptionsHandler<T>(query);
    handler.apply(opts);

    const Ctor = this.constructor as typeof ODataResource;
    return new Ctor(this.api, {
      segments,
      query,
    });
  }

  static resolveKey<T>(
    value: any,
    schema?: ODataStructuredType<T>,
  ): EntityKey<T> | undefined {
    if (isQueryCustomType(value)) {
      return value;
    } else if (Types.isPlainObject(value)) {
      return schema instanceof ODataStructuredType
        ? schema.resolveKey(value)
        : Objects.resolveKey(value);
    }
    return value as EntityKey<T> | undefined;
  }

  protected resolveKey(value: any): EntityKey<T> | undefined {
    const type = this.outgoingType();
    const structured =
      type !== undefined ? this.api.structuredType<T>(type) : undefined;
    return ODataResource.resolveKey<T>(value, structured);
  }
  //#endregion

  protected get(
    options: ODataOptions & {
      etag?: string;
      responseType?:
      | 'arraybuffer'
      | 'blob'
      | 'json'
      | 'text'
      | 'value'
      | 'property'
      | 'entity'
      | 'entities';
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    } = {},
  ): Observable<any> {
    return this.api.request<T>('GET', this, options);
  }

  protected post(
    body: any,
    options: ODataOptions & {
      responseType?:
      | 'arraybuffer'
      | 'blob'
      | 'json'
      | 'text'
      | 'value'
      | 'property'
      | 'entity'
      | 'entities';
      withCount?: boolean;
    } = {},
  ): Observable<any> {
    return this.api.request<T>('POST', this, { body, ...options });
  }

  protected put(
    body: any,
    options: ODataOptions & {
      etag?: string;
      responseType?:
      | 'arraybuffer'
      | 'blob'
      | 'json'
      | 'text'
      | 'value'
      | 'property'
      | 'entity'
      | 'entities';
      withCount?: boolean;
    } = {},
  ): Observable<any> {
    return this.api.request<T>('PUT', this, { body, ...options });
  }

  protected patch(
    body: any,
    options: ODataOptions & {
      etag?: string;
      responseType?:
      | 'arraybuffer'
      | 'blob'
      | 'json'
      | 'text'
      | 'value'
      | 'property'
      | 'entity'
      | 'entities';
      withCount?: boolean;
    } = {},
  ): Observable<any> {
    return this.api.request<T>('PATCH', this, { body, ...options });
  }

  protected delete(
    options: ODataOptions & {
      etag?: string;
      responseType?:
      | 'arraybuffer'
      | 'blob'
      | 'json'
      | 'text'
      | 'value'
      | 'property'
      | 'entity'
      | 'entities';
      withCount?: boolean;
    } = {},
  ): Observable<any> {
    return this.api.request<T>('DELETE', this, options);
  }
}
