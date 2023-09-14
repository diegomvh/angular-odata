import { Observable } from 'rxjs';
import { ODataApi } from '../api';
import {
  DEFAULT_VERSION,
  PARAM_SEPARATOR,
  QUERY_SEPARATOR,
  VALUE_SEPARATOR,
} from '../constants';
import { ODataHelper } from '../helper';
import { ODataCollection, ODataModel } from '../models';
import { ODataStructuredType } from '../schema';
import { ODataSchemaElement } from '../schema/element';
import { ParserOptions, Parser, QueryOption, PathSegment } from '../types';
import { Objects, Types } from '../utils/index';
import { ODataPathSegments, ODataPathSegmentsHandler } from './path';
import {
  isQueryCustomType,
  ODataQueryOptions,
  ODataQueryOptionsHandler,
  QueryCustomType,
} from './query';
import {
  ODataEntitiesAnnotations,
  ODataEntityAnnotations,
} from './responses/index';
import { ODataOptions } from './types';

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
  public schema?: ODataSchemaElement;
  protected pathSegments: ODataPathSegments;
  protected queryOptions: ODataQueryOptions<T>;
  constructor(
    api: ODataApi,
    {
      segments,
      query,
      schema,
    }: {
      segments?: ODataPathSegments;
      query?: ODataQueryOptions<T>;
      schema?: ODataSchemaElement;
    } = {},
  ) {
    this.api = api;
    this.pathSegments = segments || new ODataPathSegments();
    this.queryOptions = query || new ODataQueryOptions();
    this.schema = schema;
  }

  /**
   * @returns string The type of the resource
   */
  type() {
    return this.pathSegments.last()?.type();
  }

  /**
   * @returns string The type of the return
   */
  returnType() {
    return this.pathSegments.last()?.type();
  }

  /**
   * @returns string All covered types of the resource
   */
  types(): string[] {
    return this.pathSegments.types();
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
  asModel<M extends ODataModel<T>>(
    entity?: Partial<T> | { [name: string]: any },
    { annots }: { annots?: ODataEntityAnnotations<T> } = {},
  ): M {
    const reset = annots !== undefined;
    let resource: ODataResource<T> = this as ODataResource<T>;
    const type = annots?.type || this.returnType();
    if (type === undefined) throw Error('');
    const ModelType = this.api.modelForType(type);
    let entitySet = annots?.entitySet;
    if (entitySet !== undefined) {
      resource = this.api.entitySet<T>(entitySet).entity(entity as Partial<T>);
      resource.query((q) => q.apply(this.queryOptions.toQueryArguments()));
    }
    return new ModelType(entity, { resource, annots, reset }) as M;
  }

  asCollection<M extends ODataModel<T>, C extends ODataCollection<T, M>>(
    entities?: Partial<T>[] | { [name: string]: any }[],
    { annots }: { annots?: ODataEntitiesAnnotations<T> } = {},
  ): C {
    const reset = annots !== undefined;
    let resource: ODataResource<T> = this as ODataResource<T>;
    const type = annots?.type || this.returnType();
    if (type === undefined) throw Error('');
    const CollectionType = this.api.collectionForType(type);
    let path = annots?.entitySet;
    if (path !== undefined) {
      resource = this.api.entitySet<T>(path);
      resource.query((q) => q.apply(this.queryOptions.toQueryArguments()));
    }
    return new CollectionType(entities, { resource, annots, reset }) as C;
  }
  //#endregion

  isSubtypeOf(other: ODataResource<any>) {
    return (
      this.schema !== undefined &&
      other.schema !== undefined &&
      this.schema?.isSubtypeOf(other.schema)
    );
  }

  isSupertypeOf(other: ODataResource<any>) {
    return (
      this.schema !== undefined &&
      other.schema !== undefined &&
      this.schema?.isSupertypeOf(other.schema)
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

  pathAndParams(escape: boolean = false): [string, { [name: string]: any }] {
    const parser =
      this.schema !== undefined && 'parser' in this.schema
        ? ((<any>this.schema).parser as Parser<T>)
        : undefined;
    const [spath, sparams] = this.pathSegments.pathAndParams({
      escape,
      parser,
    });
    const [, qparams] = this.queryOptions.pathAndParams({ escape, parser });

    return [spath, { ...sparams, ...qparams }];
  }

  endpointUrl(params: boolean = true) {
    if (params) {
      return `${this.api.serviceRootUrl}${this}`;
    } else {
      let [path] = this.pathAndParams();
      return `${this.api.serviceRootUrl}${path}`;
    }
  }

  toString(escape: boolean = false): string {
    let [path, params] = this.pathAndParams(escape);
    let queryString = Object.entries(params)
      .map((e) => `${e[0]}${VALUE_SEPARATOR}${e[1]}`)
      .join(PARAM_SEPARATOR);
    return queryString ? `${path}${QUERY_SEPARATOR}${queryString}` : path;
  }

  clone(): ODataResource<T> {
    const Ctor = this.constructor as typeof ODataResource;
    return new Ctor(this.api, {
      schema: this.schema,
      segments: this.cloneSegments(),
      query: this.cloneQuery<T>(),
    });
  }

  private __parser(
    value: any,
    options?: ParserOptions,
    type?: string,
  ): Parser<T> | undefined {
    const dataType =
      options !== undefined && Types.isPlainObject(value)
        ? ODataHelper[options.version || DEFAULT_VERSION].type(value)
        : type;
    if (dataType !== undefined) {
      // Parser from type
      return this.api.parserForType<T>(dataType);
    } else if (this.schema !== undefined && 'parser' in this.schema) {
      // Parser from resource schema
      return (<any>this.schema).parser as Parser<T> | undefined;
    }
    return undefined;
  }

  deserialize(value: any, options?: ParserOptions): any {
    const resourceType = this.returnType();
    const _d = (value: any, options?: ParserOptions) => {
      const parser = this.__parser(value, options, resourceType);
      return parser !== undefined && 'deserialize' in parser
        ? parser.deserialize(value, options)
        : value;
    };
    return Array.isArray(value)
      ? value.map((v) => _d(v, options))
      : _d(value, options);
  }

  serialize(value: any, options?: ParserOptions): any {
    const resourceType = this.type();
    const _s = (value: any, options?: ParserOptions) => {
      const parser = this.__parser(value, options, resourceType);
      return parser !== undefined && 'serialize' in parser
        ? parser.serialize(value, options)
        : value;
    };
    return Array.isArray(value)
      ? value.map((v) => _s(v, options))
      : _s(value, options);
  }

  encode(value: any, options?: ParserOptions): any {
    const resourceType = this.type();
    const _e = (value: any, options?: ParserOptions) => {
      const parser = this.__parser(value, options, resourceType);
      return parser !== undefined && 'encode' in parser
        ? parser.encode(value, options)
        : value;
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
    /*
    const type = this.type();
    const schema = type ? this.api.findStructuredTypeForType<T>(type) : undefined;
    */
    f(
      new ODataPathSegmentsHandler<T>(this.pathSegments),
      this.schema instanceof ODataStructuredType ? this.schema : undefined,
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
    /*
    const type = this.returnType();
    const schema = type ? this.api.findStructuredTypeForType<T>(type) : undefined;
    */
    f(
      new ODataQueryOptionsHandler<T>(this.queryOptions),
      this.schema instanceof ODataStructuredType ? this.schema : undefined,
    );
    return this;
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
    return ODataResource.resolveKey<T>(
      value,
      this.schema as ODataStructuredType<T>,
    );
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
