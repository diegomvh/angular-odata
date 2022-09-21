import { HttpEvent, HttpEventType } from '@angular/common/http';
import { NEVER, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ODataCache, ODataInMemoryCache } from './cache/index';
import { DEFAULT_VERSION } from './constants';
import { ODataCollection, ODataModel, ODataModelOptions } from './models/index';
import { ODataApiOptions } from './options';
import {
  ODataActionResource,
  ODataBatchResource,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataFunctionResource,
  ODataMetadataResource,
  ODataNavigationPropertyResource,
  ODataOptions,
  ODataPathSegments,
  ODataQueryOptions,
  ODataRequest,
  ODataResource,
  ODataResponse,
  ODataSegment,
  ODataSingletonResource,
} from './resources/index';
import {
  EDM_PARSERS,
  ODataCallable,
  ODataEntitySet,
  ODataEnumType,
  ODataSchema,
  ODataStructuredType,
} from './schema';
import { ODataEntityService } from './services/entity';
import {
  ApiConfig,
  ApiOptions,
  NONE_PARSER,
  Parser,
  PathSegmentNames,
  QueryOptionNames,
} from './types';

/**
 * Api abstraction for consuming OData services.
 */
export class ODataApi {
  requester?: (request: ODataRequest<any>) => Observable<any>;
  serviceRootUrl: string;
  metadataUrl: string;
  name?: string;
  version: string;
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
    this.version = config.version || DEFAULT_VERSION;
    this.default = config.default || false;
    this.creation = config.creation || new Date();
    this.options = new ODataApiOptions(
      Object.assign(<ApiOptions>{ version: this.version }, config.options || {})
    );

    this.cache = (config.cache as ODataCache) || new ODataInMemoryCache();
    this.errorHandler = config.errorHandler;

    this.parsers = new Map(Object.entries(config.parsers || EDM_PARSERS));

    this.schemas = (config.schemas || []).map(
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
        parserForType: (type: string) => this.parserForType(type),
        findOptionsForType: (type: string) => this.findOptionsForType(type),
      });
    });
  }

  fromJSON<P, R>(json: {
    segments: ODataSegment[];
    options: { [name: string]: any };
  }): ODataActionResource<P, R> | ODataFunctionResource<P, R>;
  fromJSON<E>(json: {
    segments: ODataSegment[];
    options: { [name: string]: any };
  }):
    | ODataEntityResource<E>
    | ODataEntitySetResource<E>
    | ODataNavigationPropertyResource<E>
    | ODataSingletonResource<E>;
  fromJSON(json: {
    segments: ODataSegment[];
    options: { [name: string]: any };
  }) {
    const segments = new ODataPathSegments(json.segments);
    const query = new ODataQueryOptions(json.options);
    switch (segments.last()?.name as PathSegmentNames) {
      case PathSegmentNames.entitySet:
        if (segments.last()?.hasKey()) {
          return new ODataEntityResource(this, { segments, query });
        } else {
          return new ODataEntitySetResource(this, { segments, query });
        }
      case PathSegmentNames.navigationProperty:
        return new ODataNavigationPropertyResource(this, { segments, query });
      case PathSegmentNames.singleton:
        return new ODataSingletonResource(this, { segments, query });
      case PathSegmentNames.action:
        return new ODataActionResource(this, { segments, query });
      case PathSegmentNames.function:
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
  singleton<T>(path: string) {
    const entitySet = this.findEntitySetByName(path);
    const schema =
      entitySet !== undefined
        ? this.findStructuredTypeForType<T>(entitySet.entityType)
        : undefined;
    return ODataSingletonResource.factory<T>(this, { path, schema });
  }

  /**
   * Build an entity set resource.
   * @param path Name of the entity set
   * @returns
   */
  entitySet<T>(path: string): ODataEntitySetResource<T> {
    const entitySet = this.findEntitySetByName(path);
    const schema =
      entitySet !== undefined
        ? this.findStructuredTypeForType<T>(entitySet.entityType)
        : undefined;
    return ODataEntitySetResource.factory<T>(this, { path, schema });
  }

  /**
   * Unbound Action
   * @param  {string} path?
   * @returns ODataActionResource
   */
  action<P, R>(path: string): ODataActionResource<P, R> {
    const schema = this.findCallableForType<R>(path);
    return ODataActionResource.factory<P, R>(this, { path, schema });
  }

  /**
   * Unbound Function
   * @param  {string} path?
   * @returns ODataFunctionResource
   */
  function<P, R>(path: string): ODataFunctionResource<P, R> {
    const schema = this.findCallableForType<R>(path);
    return ODataFunctionResource.factory<P, R>(this, { path, schema });
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
      bodyQueryOptions?: QueryOptionNames[];
    }
  ): Observable<any> {
    let req = ODataRequest.factory(this, method, resource, {
      body: options.body,
      etag: options.etag,
      context: options.context,
      headers: options.headers,
      params: options.params,
      responseType: options.responseType,
      observe: (options.observe === 'events' ? 'events' : 'response') as | 'events' | 'response',
      withCount: options.withCount,
      bodyQueryOptions: options.bodyQueryOptions,
      reportProgress: options.reportProgress,
      fetchPolicy: options.fetchPolicy,
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
    forType: {
      enum: Map<string, ODataEnumType<any> | undefined>;
      structured: Map<string, ODataStructuredType<any> | undefined>;
      callable: Map<string, ODataCallable<any> | undefined>;
      entitySet: Map<string, ODataEntitySet | undefined>;
      parser: Map<string, Parser<any>>;
      options: Map<string, ODataModelOptions<any> | undefined>;
    };
    byName: {
      enum: Map<string, ODataEnumType<any> | undefined>;
      structured: Map<string, ODataStructuredType<any> | undefined>;
      callable: Map<string, ODataCallable<any> | undefined>;
      entitySet: Map<string, ODataEntitySet | undefined>;
    };
  } = {
    forType: {
      enum: new Map<string, ODataEnumType<any> | undefined>(),
      structured: new Map<string, ODataStructuredType<any> | undefined>(),
      callable: new Map<string, ODataCallable<any> | undefined>(),
      entitySet: new Map<string, ODataEntitySet | undefined>(),
      parser: new Map<string, Parser<any>>(),
      options: new Map<string, ODataModelOptions<any> | undefined>(),
    },
    byName: {
      enum: new Map<string, ODataEnumType<any> | undefined>(),
      structured: new Map<string, ODataStructuredType<any> | undefined>(),
      callable: new Map<string, ODataCallable<any> | undefined>(),
      entitySet: new Map<string, ODataEntitySet | undefined>(),
    },
  };

  private findSchemaForType(type: string) {
    const schemas = this.schemas.filter((s) => s.isNamespaceOf(type));
    if (schemas.length === 0) return undefined;
    if (schemas.length === 1) return schemas[0];
    return schemas
      .sort((s1, s2) => s1.namespace.length - s2.namespace.length)
      .pop();
  }

  public findEnumTypeForType<T>(type: string) {
    if (this.memo.forType.enum.has(type)) {
      return this.memo.forType.enum.get(type) as ODataEnumType<T> | undefined;
    }
    const enumType = this.findSchemaForType(type)?.findEnumTypeForType<T>(type);
    this.memo.forType.enum.set(type, enumType);
    return enumType;
  }

  public findStructuredTypeForType<T>(type: string) {
    if (this.memo.forType.structured.has(type)) {
      return this.memo.forType.structured.get(type) as
        | ODataStructuredType<T>
        | undefined;
    }
    const structuredType =
      this.findSchemaForType(type)?.findStructuredTypeForType<T>(type);
    this.memo.forType.structured.set(type, structuredType);
    return structuredType;
  }

  public findCallableForType<T>(type: string, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${type}` : type;
    if (this.memo.forType.callable.has(key)) {
      return this.memo.forType.callable.get(key) as
        | ODataCallable<T>
        | undefined;
    }
    const callable = this.findSchemaForType(type)?.findCallableForType<T>(
      type,
      bindingType
    );
    this.memo.forType.callable.set(key, callable);
    return callable;
  }

  public findEntitySetForType(type: string) {
    if (this.memo.forType.entitySet.has(type)) {
      return this.memo.forType.entitySet.get(type) as
        | ODataEntitySet
        | undefined;
    }
    const entitySet = this.findSchemaForType(type)?.findEntitySetForType(type);
    this.memo.forType.entitySet.set(type, entitySet);
    return entitySet;
  }

  public findModelForType(type: string) {
    return this.findStructuredTypeForType<any>(type)?.model;
  }

  public modelForType(type: string) {
    let Model = this.findModelForType(type);
    if (Model === undefined) {
      // Build Ad-hoc model
      let schema = this.findStructuredTypeForType<any>(type);
      if (schema === undefined) throw Error(`No schema for ${type}`);
      Model = class extends ODataModel<any> {} as typeof ODataModel;
      // Build Meta
      Model.buildMeta({ schema });
      // Configure
      Model.meta.configure({
        options: this.options.parserOptions,
        parserForType: (type: string) => this.parserForType(type),
        findOptionsForType: (type: string) => this.findOptionsForType(type),
      });
      // Store New Model for next time
      schema.model = Model;
    }
    return Model;
  }

  public findCollectionForType(type: string) {
    return this.findStructuredTypeForType<any>(type)?.collection;
  }

  public collectionForType(type: string) {
    let Collection = this.findCollectionForType(type);
    if (Collection === undefined) {
      let schema = this.findStructuredTypeForType<any>(type);
      if (schema === undefined) throw Error('');
      Collection = class extends ODataCollection<
        any,
        ODataModel<any>
      > {} as typeof ODataCollection;
      Collection.model = this.modelForType(type);
      // Store New Collection for next time
      schema.collection = Collection;
    }
    return Collection;
  }

  public findServiceForType(type: string) {
    return this.findEntitySetForType(type)?.service as
      | typeof ODataEntityService
      | undefined;
  }

  public findEntitySetForEntityType(entityType: string) {
    if (this.memo.forType.entitySet.has(entityType)) {
      return this.memo.forType.entitySet.get(entityType) as
        | ODataEntitySet
        | undefined;
    }
    const entitySet = this.schemas
      .reduce(
        (acc, schema) => [...acc, ...schema.entitySets],
        <ODataEntitySet[]>[]
      )
      .find((e) => e.entityType === entityType);
    this.memo.forType.entitySet.set(entityType, entitySet);
    return entitySet;
  }

  public findServiceForEntityType(entityType: string) {
    return this.findEntitySetForEntityType(entityType)?.service as
      | typeof ODataEntityService
      | undefined;
  }

  public findEnumTypeByName<T>(name: string) {
    if (this.memo.byName.enum.has(name)) {
      return this.memo.byName.enum.get(name) as ODataEnumType<T> | undefined;
    }
    const enumType = this.schemas
      .reduce(
        (acc, schema) => [...acc, ...schema.enums],
        <ODataEnumType<T>[]>[]
      )
      .find((e) => e.name === name);
    this.memo.byName.enum.set(name, enumType);
    return enumType;
  }

  public findStructuredTypeByName<T>(name: string) {
    if (this.memo.byName.structured.has(name)) {
      return this.memo.byName.structured.get(name) as
        | ODataStructuredType<T>
        | undefined;
    }
    const structuredType = this.schemas
      .reduce(
        (acc, schema) => [...acc, ...schema.entities],
        <ODataStructuredType<T>[]>[]
      )
      .find((e) => e.name === name);
    this.memo.byName.structured.set(name, structuredType);
    return structuredType;
  }

  public findCallableByName<T>(name: string, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${name}` : name;
    if (this.memo.byName.callable.has(key)) {
      return this.memo.byName.callable.get(key) as ODataCallable<T> | undefined;
    }
    const callable = this.schemas
      .reduce(
        (acc, schema) => [...acc, ...schema.callables],
        <ODataCallable<T>[]>[]
      )
      .find(
        (c) =>
          c.name === name &&
          (bindingType === undefined || c.binding()?.type === bindingType)
      );
    this.memo.byName.callable.set(key, callable);
    return callable;
  }

  public findEntitySetByName(name: string) {
    if (this.memo.byName.entitySet.has(name)) {
      return this.memo.byName.entitySet.get(name) as ODataEntitySet | undefined;
    }
    const schema = this.schemas
      .reduce(
        (acc, schema) => [...acc, ...schema.entitySets],
        <ODataEntitySet[]>[]
      )
      .find((e) => e.name === name);
    this.memo.byName.entitySet.set(name, schema);
    return schema;
  }

  public findModelByName(name: string) {
    return this.findStructuredTypeByName<any>(name)?.model as
      | typeof ODataModel
      | undefined;
  }

  public findCollectionByName(name: string) {
    return this.findStructuredTypeByName<any>(name)?.collection as
      | typeof ODataCollection
      | undefined;
  }

  public findServiceByName(name: string) {
    return this.findEntitySetByName(name)?.service as
      | typeof ODataEntityService
      | undefined;
  }

  public parserForType<T>(type: string, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${type}` : type;
    if (this.memo.forType.parser.has(key)) {
      return this.memo.forType.parser.get(key) as Parser<T>;
    }
    // None Parser by default
    let parser: Parser<T> = NONE_PARSER;
    if (this.parsers.has(type)) {
      // Edm, Base Parsers
      parser = this.parsers.get(type) as Parser<T>;
    } else if (!type.startsWith('Edm.')) {
      // EnumType, ComplexType and EntityType Parsers
      let value =
        this.findCallableForType<T>(type, bindingType) ||
        this.findEnumTypeForType<T>(type) ||
        this.findStructuredTypeForType<T>(type);
      parser = value?.parser as Parser<T>;
    }
    // Set Parser for next time
    this.memo.forType.parser.set(key, parser);
    return parser;
  }

  public findOptionsForType<T>(type: string) {
    // Strucutred Options
    if (this.memo.forType.options.has(type)) {
      return this.memo.forType.options.get(type) as
        | ODataModelOptions<T>
        | undefined;
    }
    const st = this.findStructuredTypeForType<T>(type);
    const options = st?.model?.meta;
    // Set Options for next time
    this.memo.forType.options.set(type, options);
    return options;
  }
}
