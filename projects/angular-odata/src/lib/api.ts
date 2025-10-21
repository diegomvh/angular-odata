import { HttpEvent, HttpEventType } from '@angular/common/http';
import { NEVER, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DEFAULT_VERSION } from './constants';
import { ModelOptions, ODataCollection, ODataModel, ODataModelOptions } from './models';
import { ODataApiOptions } from './options';
import type { ODataOptions, ODataResource, ODataSegment } from './resources';
import {
  ODataQueryOptions,
  ODataPathSegments,
  ODataRequest,
  ODataResponse,
  ODataBatchResource,
  ODataMetadataResource,
  ODataActionResource,
  ODataFunctionResource,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataSingletonResource,
  ODataNavigationPropertyResource,
} from './resources';
import {
  EDM_PARSERS,
  ODataCallable,
  ODataEntitySet,
  ODataEnumType,
  ODataSchema,
  ODataSingleton,
  ODataStructuredType,
} from './schema';
import {
  ODataApiConfig,
  EdmType,
  NONE_PARSER,
  ODataVersion,
  Parser,
  PathSegment,
  QueryOption,
  ODataSchemaConfig,
  ODataCache,
} from './types';
import type { ODataMetadata } from './metadata/metadata';

/**
 * Api abstraction for consuming OData services.
 */
export class ODataApi {
  requester?: (request: ODataRequest<any>) => Observable<any>;
  serviceRootUrl: string;
  metadataUrl: string;
  name?: string;
  version: ODataVersion;
  default: boolean;
  creation: Date;
  // Options
  options: ODataApiOptions;
  // Cache
  cache?: ODataCache;
  // Error Handler
  errorHandler?: (error: any, caught: Observable<any>) => Observable<never>;
  // Base Parsers
  parsers: Map<string, Parser<any>>;
  // Schemas
  schemas: ODataSchema[];

  constructor(config: ODataApiConfig) {
    this.serviceRootUrl = config.serviceRootUrl;
    if (this.serviceRootUrl.includes('?'))
      throw new Error(
        "The 'serviceRootUrl' should not contain query string. Please use 'params' to add extra parameters",
      );
    if (!this.serviceRootUrl.endsWith('/')) this.serviceRootUrl += '/';
    this.metadataUrl = config.metadataUrl ?? `${this.serviceRootUrl}$metadata`;
    this.name = config.name;
    this.version = config.version ?? DEFAULT_VERSION;
    this.default = config.default ?? false;
    this.creation = config.creation ?? new Date();
    this.options = new ODataApiOptions({
      ...config.options,
      version: this.version,
    });

    this.cache = config.cache;
    this.errorHandler = config.errorHandler;
    this.parsers = new Map(Object.entries(config.parsers ?? EDM_PARSERS));

    this.schemas = (config.schemas ?? []).map((schema) => new ODataSchema(schema, this));
  }

  configure(
    settings: {
      requester?: (request: ODataRequest<any>) => Observable<any>;
    } = {},
  ) {
    this.requester = settings.requester;
    this.schemas.forEach((schema) => {
      schema.configure({
        options: this.options.parserOptions,
      });
    });
  }

  populate(metadata: ODataMetadata) {
    const config = metadata.toConfig();
    this.version = config.version ?? DEFAULT_VERSION;
    const schemas = (config.schemas ?? []).map((schema) => new ODataSchema(schema, this));
    this.schemas = [...this.schemas, ...schemas];
    schemas.forEach((schema) => {
      schema.configure({
        options: this.options.parserOptions,
      });
    });
  }

  fromJson<P, R>(json: {
    segments: ODataSegment[];
    options: { [name: string]: any };
  }): ODataActionResource<P, R> | ODataFunctionResource<P, R>;
  fromJson<E>(json: {
    segments: ODataSegment[];
    options: { [name: string]: any };
  }):
    | ODataEntityResource<E>
    | ODataEntitySetResource<E>
    | ODataNavigationPropertyResource<E>
    | ODataSingletonResource<E>;
  fromJson(json: { segments: ODataSegment[]; options: { [name: string]: any } }) {
    const segments = ODataPathSegments.fromJson(json.segments);
    const query = ODataQueryOptions.fromJson<any>(json.options);
    switch (segments.last()?.name as PathSegment) {
      case PathSegment.entitySet:
        if (segments.last()?.hasKey()) {
          return new ODataEntityResource(this, { segments, query });
        } else {
          return new ODataEntitySetResource(this, { segments, query });
        }
      case PathSegment.navigationProperty:
        return new ODataNavigationPropertyResource(this, { segments, query });
      case PathSegment.singleton:
        return new ODataSingletonResource(this, { segments, query });
      case PathSegment.action:
        return new ODataActionResource(this, { segments, query });
      case PathSegment.function:
        return new ODataFunctionResource(this, { segments, query });
    }
    throw new Error('No Resource for json');
  }

  /**
   * Build a metadata resource.
   * @returns ODataMetadataResource
   */
  metadata(): ODataMetadataResource {
    return ODataMetadataResource.factory(this);
  }

  /**
   * Build a batch resource.
   * @returns ODataBatchResource
   */
  batch(): ODataBatchResource {
    return ODataBatchResource.factory(this);
  }

  /**
   * Build a singleton resource.
   * @param path Name of the singleton
   * @returns
   */
  singleton<T>(name: string) {
    const singleton = this.findSingleton(name);
    return ODataSingletonResource.factory<T>(this, {
      path: singleton?.name ?? name,
      type: singleton?.singletonType,
    });
  }

  /**
   * Build an entity set resource.
   * @param path Name of the entity set
   * @returns
   */
  entitySet<T>(name: string): ODataEntitySetResource<T> {
    const entitySet = this.findEntitySet(name);
    return ODataEntitySetResource.factory<T>(this, {
      path: entitySet?.name ?? name,
      type: entitySet?.entityType,
    });
  }

  /**
   * Unbound Action
   * @param  {string} path?
   * @returns ODataActionResource
   */
  action<P, R>(path: string): ODataActionResource<P, R> {
    const callable = this.findCallable<R>(path);
    return ODataActionResource.factory<P, R>(this, {
      path,
      outgoingType: callable?.type(),
      incomingType: callable?.returnType(),
    });
  }

  /**
   * Unbound Function
   * @param  {string} path?
   * @returns ODataFunctionResource
   */
  function<P, R>(path: string): ODataFunctionResource<P, R> {
    const callable = this.findCallable<R>(path);
    return ODataFunctionResource.factory<P, R>(this, {
      path,
      outgoingType: callable?.type(),
      incomingType: callable?.returnType(),
    });
  }

  callable<T>(type: string) {
    return this.findCallable<T>(type);
  }

  enumType<T>(type: string) {
    return this.findEnumType<T>(type);
  }

  structuredType<T>(type: string) {
    return this.findStructuredType<T>(type);
  }

  //request(req: ODataRequest<any>): Observable<any> {
  request<T>(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body?: any;
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
      observe?: 'body' | 'events' | 'response';
      withCount?: boolean;
      bodyQueryOptions?: QueryOption[];
    },
  ): Observable<any> {
    let req = ODataRequest.factory(this, method, resource, {
      body: options.body,
      etag: options.etag,
      context: options.context,
      headers: options.headers,
      params: options.params,
      responseType: options.responseType,
      observe: (options.observe === 'events' ? 'events' : 'response') as 'events' | 'response',
      withCount: options.withCount,
      bodyQueryOptions: options.bodyQueryOptions,
      reportProgress: options.reportProgress,
      fetchPolicy: options.fetchPolicy,
      parserOptions: options.parserOptions,
      withCredentials: options.withCredentials,
    });

    let res$ = this.requester !== undefined ? this.requester(req) : NEVER;

    res$ = res$.pipe(
      map((res: HttpEvent<any>) =>
        res.type === HttpEventType.Response ? ODataResponse.fromHttpResponse<any>(req, res) : res,
      ),
    );

    if (this.errorHandler !== undefined) res$ = res$.pipe(catchError(this.errorHandler));

    if (options.observe === 'events') {
      return res$;
    }

    if (this.cache !== undefined) {
      res$ = this.cache.handleRequest(req, res$);
    }

    switch (options.observe || 'body') {
      case 'body':
        switch (options.responseType) {
          case 'entities':
            return res$.pipe(map((res: ODataResponse<T>) => res.entities()));
          case 'entity':
            return res$.pipe(map((res: ODataResponse<T>) => res.entity()));
          case 'property':
            return res$.pipe(map((res: ODataResponse<T>) => res.property()));
          case 'value':
            return res$.pipe(map((res: ODataResponse<T>) => res.value() as T));
          default:
            // Other responseTypes (arraybuffer, blob, json, text) return body
            return res$.pipe(map((res: ODataResponse<T>) => res.body));
        }
      case 'response':
        // The response stream was requested directly, so return it.
        return res$;
      default:
        // Guard against new future observe types being added.
        throw new Error(`Unreachable: unhandled observe type ${options.observe}}`);
    }
  }

  //# region Find by Type
  // Memoize
  private memo: {
    enumTypes: Map<string, ODataEnumType<any> | undefined>;
    structuredTypes: Map<string, ODataStructuredType<any> | undefined>;
    callables: Map<string, ODataCallable<any> | undefined>;
    entitySets: Map<string, ODataEntitySet | undefined>;
    singletons: Map<string, ODataSingleton | undefined>;
    parsers: Map<string, Parser<any>>;
    options: Map<string, ODataModelOptions<any> | undefined>;
  } = {
    enumTypes: new Map<string, ODataEnumType<any> | undefined>(),
    structuredTypes: new Map<string, ODataStructuredType<any> | undefined>(),
    callables: new Map<string, ODataCallable<any> | undefined>(),
    entitySets: new Map<string, ODataEntitySet | undefined>(),
    singletons: new Map<string, ODataSingleton | undefined>(),
    parsers: new Map<string, Parser<any>>(),
    options: new Map<string, ODataModelOptions<any> | undefined>(),
  };

  public createSchema(config: ODataSchemaConfig) {
    const schema = new ODataSchema(config, this);
    schema.configure({
      options: this.options.parserOptions,
    });
    this.schemas.push(schema);
    return schema;
  }

  public findSchema(type: string) {
    const schemas = this.schemas.filter((s) => s.isNamespaceOf(type));
    if (schemas.length === 0) return undefined;
    if (schemas.length === 1) return schemas[0];
    return schemas.sort((s1, s2) => s1.namespace.length - s2.namespace.length).pop();
  }

  //#region EnumTypes
  public findEnumType<T>(value: string) {
    if (this.memo.enumTypes.has(value)) {
      return this.memo.enumTypes.get(value) as ODataEnumType<T> | undefined;
    }
    const enumTypes = this.schemas.reduce(
      (acc, schema) => [...acc, ...schema.enums],
      <ODataEnumType<T>[]>[],
    );
    let enumType = enumTypes.find((e) => e.type() === value);
    enumType = enumType ?? enumTypes.find((e) => e.name === value);
    this.memo.enumTypes.set(value, enumType);
    return enumType;
  }
  //#endregion

  //#region StructuredTypes
  public findStructuredType<T>(value: string) {
    if (this.memo.structuredTypes.has(value)) {
      return this.memo.structuredTypes.get(value) as ODataStructuredType<T> | undefined;
    }
    const structuredTypes = this.schemas.reduce(
      (acc, schema) => [...acc, ...schema.entities],
      <ODataStructuredType<T>[]>[],
    );
    let structuredType = structuredTypes.find((e) => e.type() === value);
    structuredType = structuredType ?? structuredTypes.find((e) => e.name === value);
    this.memo.structuredTypes.set(value, structuredType);
    return structuredType;
  }
  //#endregion

  //#region Callables
  public findCallable<R>(value: string, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${value}` : value;
    if (this.memo.callables.has(key)) {
      return this.memo.callables.get(key) as ODataCallable<R> | undefined;
    }

    const bindingStructuredType =
      bindingType !== undefined ? this.findStructuredType<any>(bindingType) : undefined;
    const callables = this.schemas.reduce(
      (acc, schema) => [...acc, ...schema.callables],
      <ODataCallable<R>[]>[],
    );
    let callable = callables.find((c) => {
      const isCallableType = c.type() == value;
      const callableBindingType = c.binding()?.type;
      const callableBindingStructuredType =
        callableBindingType !== undefined
          ? this.findStructuredType(callableBindingType)
          : undefined;

      return (
        isCallableType &&
        (!bindingStructuredType ||
          (callableBindingStructuredType &&
            bindingStructuredType.isSubtypeOf(callableBindingStructuredType)))
      );
    });
    callable =
      callable ??
      callables.find((c) => {
        const isCallableType = c.name == value;
        const callableBindingType = c.binding()?.type;
        const callableBindingStructuredType =
          callableBindingType !== undefined
            ? this.findStructuredType(callableBindingType)
            : undefined;

        return (
          isCallableType &&
          (!bindingStructuredType ||
            (callableBindingStructuredType &&
              bindingStructuredType.isSubtypeOf(callableBindingStructuredType)))
        );
      });

    this.memo.callables.set(key, callable);
    return callable;
  }
  //#endregion

  //#region EntitySets
  public findEntitySet(value: string) {
    if (this.memo.entitySets.has(value)) {
      return this.memo.entitySets.get(value) as ODataEntitySet | undefined;
    }
    const entitySets = this.schemas.reduce(
      (acc, schema) => [...acc, ...schema.entitySets],
      <ODataEntitySet[]>[],
    );
    let entitySet = entitySets.find((e) => e.type() === value);
    entitySet = entitySet ?? entitySets.find((e) => e.name === value);
    this.memo.entitySets.set(value, entitySet);
    return entitySet;
  }
  //#endregion

  //#region Singletons
  public findSingleton(value: string) {
    if (this.memo.singletons.has(value)) {
      return this.memo.singletons.get(value) as ODataSingleton | undefined;
    }
    const singletons = this.schemas.reduce(
      (acc, schema) => [...acc, ...schema.singletons],
      <ODataSingleton[]>[],
    );
    let singleton = singletons.find((e) => e.type() === value);
    singleton = singleton ?? singletons.find((e) => e.name === value);
    this.memo.singletons.set(value, singleton);
    return singleton;
  }
  //#endregion

  public findModel(type: string) {
    return this.findStructuredType<any>(type)?.model;
  }

  public createModel(structured: ODataStructuredType<any>) {
    if (structured.model !== undefined) return structured.model;
    // Build Ad-hoc model
    const Model = class extends ODataModel<any> {} as typeof ODataModel;
    // Build Meta
    Model.meta = this.optionsForType(structured.type(), {
      structuredType: structured,
    })!;
    if (Model.meta !== undefined) {
      // Configure
      Model.meta.configure({
        options: this.options.parserOptions,
      });
    }
    // Store New Model for next time
    structured.model = Model;
    return Model;
  }

  public modelForType(type: string) {
    let Model = this.findModel(type);
    if (Model === undefined) {
      const structured = this.findStructuredType<any>(type);
      if (structured === undefined) throw Error(`No structured type for ${type}`);
      Model = this.createModel(structured);
    }
    return Model;
  }

  public findCollection(type: string) {
    return this.findStructuredType<any>(type)?.collection;
  }

  public createCollection(structured: ODataStructuredType<any>, model?: typeof ODataModel<any>) {
    if (structured.collection !== undefined) return structured.collection;
    if (model === undefined) model = this.createModel(structured);
    const Collection = class extends ODataCollection<any, ODataModel<any>> {
      static override model = model!;
    } as typeof ODataCollection;
    structured.collection = Collection;
    return Collection;
  }

  public collectionForType(type: string) {
    let Collection = this.findCollection(type);
    if (Collection === undefined) {
      const structured = this.findStructuredType<any>(type);
      if (structured === undefined) throw Error(`No structured type for ${type}`);
      const Model = this.modelForType(type);
      Collection = this.createCollection(structured, Model);
    }
    return Collection;
  }

  public findEntitySetForEntityType(entityType: string) {
    if (this.memo.entitySets.has(entityType)) {
      return this.memo.entitySets.get(entityType) as ODataEntitySet | undefined;
    }
    const entitySet = this.schemas
      .reduce((acc, schema) => [...acc, ...schema.entitySets], <ODataEntitySet[]>[])
      .find((e) => e.entityType === entityType);
    this.memo.entitySets.set(entityType, entitySet);
    return entitySet;
  }

  public parserForType<T>(type: string | EdmType, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${type}` : type;
    if (this.memo.parsers.has(key)) {
      return this.memo.parsers.get(key) as Parser<T>;
    }
    // None Parser by default
    let parser: Parser<T> = NONE_PARSER;
    if (this.parsers.has(type)) {
      // Edm, Base Parsers
      parser = this.parsers.get(type) as Parser<T>;
    } else if (!type.startsWith('Edm.')) {
      // Callable, EnumType, StructuredType (ComplexType and EntityType) Parsers
      let value =
        this.findCallable<T>(type, bindingType) ??
        this.findEnumType<T>(type) ??
        this.findStructuredType<T>(type);
      parser = value?.parser as Parser<T>;
    }
    // Set Parser for next time
    this.memo.parsers.set(key, parser);
    return parser;
  }

  public optionsForType<T>(
    type: string,
    {
      structuredType,
      config,
    }: { structuredType?: ODataStructuredType<T>; config?: ModelOptions } = {},
  ) {
    // Strucutred Options
    if (this.memo.options.has(type)) {
      return this.memo.options.get(type) as ODataModelOptions<T> | undefined;
    }

    let meta: ODataModelOptions<T> | undefined = undefined;
    if (!type.startsWith('Edm.')) {
      structuredType = this.findStructuredType<T>(type) ?? structuredType;
      if (structuredType !== undefined) {
        meta = ODataModel.buildMetaOptions({ config, structuredType });
      }
    }
    // Set Options for next time
    this.memo.options.set(type, meta);
    return meta;
  }
}
