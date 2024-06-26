import { HttpEvent, HttpEventType } from '@angular/common/http';
import { NEVER, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ODataCache, ODataInMemoryCache } from './cache';
import { DEFAULT_VERSION } from './constants';
import { ModelOptions, ODataCollection, ODataModel, ODataModelOptions } from './models';
import { ODataApiOptions } from './options';
import {
  ODataOptions,
  ODataResource,
  ODataSegment,
} from './resources';
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
import { ODataEntityService } from './services/entity';
import {
  ApiConfig,
  ApiOptions,
  EdmType,
  NONE_PARSER,
  ODataVersion,
  Parser,
  PathSegment,
  QueryOption,
  SchemaConfig,
} from './types';
import { ODataMetadata } from './metadata/metadata';

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
  cache!: ODataCache;
  // Error Handler
  errorHandler?: (error: any, caught: Observable<any>) => Observable<never>;
  // Base Parsers
  parsers: Map<string, Parser<any>>;
  // Schemas
  schemas: ODataSchema[];

  constructor(config: ApiConfig) {
    this.serviceRootUrl = config.serviceRootUrl;
    if (this.serviceRootUrl.indexOf('?') != -1)
      throw new Error(
        "The 'serviceRootUrl' should not contain query string. Please use 'params' to add extra parameters"
      );
    if (!this.serviceRootUrl.endsWith('/')) this.serviceRootUrl += '/';
    this.metadataUrl = `${this.serviceRootUrl}$metadata`;
    this.name = config.name;
    this.version = config.version ?? DEFAULT_VERSION;
    this.default = config.default ?? false;
    this.creation = config.creation ?? new Date();
    this.options = new ODataApiOptions(
      Object.assign(<ApiOptions>{ version: this.version }, config.options || {})
    );

    this.cache = (config.cache as ODataCache) || new ODataInMemoryCache();
    this.errorHandler = config.errorHandler;

    this.parsers = new Map(Object.entries(config.parsers || EDM_PARSERS));

    this.schemas = (config.schemas ?? []).map(
      (schema) => new ODataSchema(schema, this)
    );
  }

  configure(
    settings: {
      requester?: (request: ODataRequest<any>) => Observable<any>;
    } = {}
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
  fromJson(json: {
    segments: ODataSegment[];
    options: { [name: string]: any };
  }) {
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
    const singleton = this.findSingletonByName(name);
    return ODataSingletonResource.factory<T>(this, { path: singleton?.name ?? name, type: singleton?.entityType });
  }

  /**
   * Build an entity set resource.
   * @param path Name of the entity set
   * @returns
   */
  entitySet<T>(name: string): ODataEntitySetResource<T> {
    const entitySet = this.findEntitySetByName(name);
    return ODataEntitySetResource.factory<T>(this, { path: entitySet?.name ?? name, type: entitySet?.entityType });
  }

  /**
   * Unbound Action
   * @param  {string} path?
   * @returns ODataActionResource
   */
  action<P, R>(path: string): ODataActionResource<P, R> {
    const callable = this.findCallableForType<R>(path);
    return ODataActionResource.factory<P, R>(this, { path, outgoingType: callable?.type(), incomingType: callable?.returnType() });
  }

  /**
   * Unbound Function
   * @param  {string} path?
   * @returns ODataFunctionResource
   */
  function<P, R>(path: string): ODataFunctionResource<P, R> {
    const callable = this.findCallableForType<R>(path);
    return ODataFunctionResource.factory<P, R>(this, { path, outgoingType: callable?.type(), incomingType: callable?.returnType() });
  }

  callable<T>(type: string) {
    return this.findCallableForType<T>(type);
  }

  enumType<T>(type: string) {
    return this.findEnumTypeForType<T>(type);
  }

  structuredType<T>(type: string) {
    return this.findStructuredTypeForType<T>(type);
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
    }
  ): Observable<any> {
    let req = ODataRequest.factory(this, method, resource, {
      body: options.body,
      etag: options.etag,
      context: options.context,
      headers: options.headers,
      params: options.params,
      responseType: options.responseType,
      observe: (options.observe === 'events' ? 'events' : 'response') as
        | 'events'
        | 'response',
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
        res.type === HttpEventType.Response
          ? ODataResponse.fromHttpResponse<any>(req, res)
          : res
      )
    );

    if (this.errorHandler !== undefined)
      res$ = res$.pipe(catchError(this.errorHandler));

    if (options.observe === 'events') {
      return res$;
    }

    res$ = this.cache.handleRequest(req, res$);

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
        throw new Error(
          `Unreachable: unhandled observe type ${options.observe}}`
        );
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

  public createSchema(config: SchemaConfig) {
    const schema = new ODataSchema(config, this);
    schema.configure({
      options: this.options.parserOptions
    });
    this.schemas.push(schema);
    return schema;
  }

  public findSchemaForType(type: string) {
    const schemas = this.schemas.filter((s) => s.isNamespaceOf(type));
    if (schemas.length === 0) return undefined;
    if (schemas.length === 1) return schemas[0];
    return schemas
      .sort((s1, s2) => s1.namespace.length - s2.namespace.length)
      .pop();
  }

  //#region EnumTypes
  public findEnumTypeForType<T>(type: string) {
    if (this.memo.enumTypes.has(type)) {
      return this.memo.enumTypes.get(type) as ODataEnumType<T> | undefined;
    }
    const enumType = this.findSchemaForType(type)?.findEnumTypeForType<T>(type);
    this.memo.enumTypes.set(type, enumType);
    return enumType;
  }
  //#endregion

  //#region StructuredTypes
  public findStructuredTypeForType<T>(type: string) {
    if (this.memo.structuredTypes.has(type)) {
      return this.memo.structuredTypes.get(type) as
        | ODataStructuredType<T>
        | undefined;
    }
    const structuredType =
      this.findSchemaForType(type)?.findStructuredTypeForType<T>(type);
    this.memo.structuredTypes.set(type, structuredType);
    return structuredType;
  }
  //#endregion

  //#region Callables
  public findCallableForType<T>(type: string, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${type}` : type;
    if (this.memo.callables.has(key)) {
      return this.memo.callables.get(key) as
        | ODataCallable<T>
        | undefined;
    }
    const callable = this.findSchemaForType(type)?.findCallableForType<T>(
      type,
      bindingType
    );
    this.memo.callables.set(key, callable);
    return callable;
  }
  //#endregion

  //#region EntitySets
  public findEntitySetForType(type: string) {
    if (this.memo.entitySets.has(type)) {
      return this.memo.entitySets.get(type) as
        | ODataEntitySet
        | undefined;
    }
    const entitySet = this.findSchemaForType(type)?.findEntitySetForType(type);
    this.memo.entitySets.set(type, entitySet);
    return entitySet;
  }

  public findEntitySetByName(name: string) {
    if (this.memo.entitySets.has(name)) {
      return this.memo.entitySets.get(name) as ODataEntitySet | undefined;
    }
    const schema = this.schemas
      .reduce(
        (acc, schema) => [...acc, ...schema.entitySets],
        <ODataEntitySet[]>[]
      )
      .find((e) => e.name === name);
    this.memo.entitySets.set(name, schema);
    return schema;
  }
  //#endregion

  //#region Singletons
  public findSingletonForType(type: string) {
    if (this.memo.singletons.has(type)) {
      return this.memo.singletons.get(type) as
        | ODataEntitySet
        | undefined;
    }
    const singletons = this.findSchemaForType(type)?.findSingletonForType(type);
    this.memo.singletons.set(type, singletons);
    return singletons;
  }

  public findSingletonByName(name: string) {
    if (this.memo.singletons.has(name)) {
      return this.memo.singletons.get(name) as ODataEntitySet | undefined;
    }
    const schema = this.schemas
      .reduce(
        (acc, schema) => [...acc, ...schema.entitySets],
        <ODataEntitySet[]>[]
      )
      .find((e) => e.name === name);
    this.memo.singletons.set(name, schema);
    return schema;
  }
  //#endregion

  public findModelForType(type: string) {
    return this.findStructuredTypeForType<any>(type)?.model;
  }

  public createModel(structured: ODataStructuredType<any>) {

    if (structured.model !== undefined) return structured.model;
    // Build Ad-hoc model
    const Model = class extends ODataModel<any> { } as typeof ODataModel;
    // Build Meta
    Model.meta = this.optionsForType(structured.type(), { structuredType: structured })!;
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
    let Model = this.findModelForType(type);
    if (Model === undefined) {
      const structured = this.findStructuredTypeForType<any>(type);
      if (structured === undefined) throw Error(`No structured type for ${type}`);
      Model = this.createModel(structured);
    }
    return Model;
  }

  public findCollectionForType(type: string) {
    return this.findStructuredTypeForType<any>(type)?.collection;
  }
  public createCollection(structured: ODataStructuredType<any>, model?: typeof ODataModel<any>) {
    if (structured.collection !== undefined) return structured.collection;
    if (model === undefined) model = this.createModel(structured);
    const Collection = class extends ODataCollection<
      any,
      ODataModel<any>
    > {
      static override model = model!;
    } as typeof ODataCollection;
    structured.collection = Collection;
    return Collection;
  }

  public collectionForType(type: string) {
    let Collection = this.findCollectionForType(type);
    if (Collection === undefined) {
      const structured = this.findStructuredTypeForType<any>(type);
      if (structured === undefined) throw Error(`No structured type for ${type}`);
      const Model = this.modelForType(type);
      Collection = this.createCollection(structured, Model);
    }
    return Collection;
  }

  public findServiceForType(type: string) {
    return this.findEntitySetForType(type)?.service as
      | typeof ODataEntityService
      | undefined;
  }

  public findEntitySetForEntityType(entityType: string) {
    if (this.memo.entitySets.has(entityType)) {
      return this.memo.entitySets.get(entityType) as
        | ODataEntitySet
        | undefined;
    }
    const entitySet = this.schemas
      .reduce(
        (acc, schema) => [...acc, ...schema.entitySets],
        <ODataEntitySet[]>[]
      )
      .find((e) => e.entityType === entityType);
    this.memo.entitySets.set(entityType, entitySet);
    return entitySet;
  }

  public findServiceForEntityType(entityType: string) {
    return this.findEntitySetForEntityType(entityType)?.service as
      | typeof ODataEntityService
      | undefined;
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
        this.findCallableForType<T>(type, bindingType) ??
        this.findEnumTypeForType<T>(type) ??
        this.findStructuredTypeForType<T>(type);
      parser = value?.parser as Parser<T>;
    }
    // Set Parser for next time
    this.memo.parsers.set(key, parser);
    return parser;
  }

  public optionsForType<T>(type: string, { structuredType, config }: { structuredType?: ODataStructuredType<T>, config?: ModelOptions } = {}) {
    // Strucutred Options
    if (this.memo.options.has(type)) {
      return this.memo.options.get(type) as | ODataModelOptions<T> | undefined;
    }

    let meta: ODataModelOptions<T> | undefined = undefined;
    if (!type.startsWith('Edm.')) {
      structuredType = this.findStructuredTypeForType<T>(type) ?? structuredType;
      if (structuredType !== undefined) {
        meta = ODataModel.buildMetaOptions({ config, structuredType });
      }
    }
    // Set Options for next time
    this.memo.options.set(type, meta);
    return meta;
  }
}
