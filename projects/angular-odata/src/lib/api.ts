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
  ODataPathSegments,
  ODataQueryOptions,
  ODataRequest,
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
  parsers: { [type: string]: Parser<any> };
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

    this.parsers = config.parsers || EDM_PARSERS;

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

  request(req: ODataRequest<any>): Observable<any> {
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

    return req.observe === 'response'
      ? this.cache.handleRequest(req, res$)
      : res$;
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
    if (!this.memo.forType.enum.has(type)) {
      this.memo.forType.enum.set(
        type,
        this.findSchemaForType(type)?.findEnumTypeForType<T>(type)
      );
    }
    return this.memo.forType.enum.get(type) as ODataEnumType<T> | undefined;
  }

  public findStructuredTypeForType<T>(type: string) {
    if (!this.memo.forType.structured.has(type)) {
      this.memo.forType.structured.set(
        type,
        this.findSchemaForType(type)?.findStructuredTypeForType<T>(type)
      );
    }
    return this.memo.forType.structured.get(type) as
      | ODataStructuredType<T>
      | undefined;
  }

  public findCallableForType<T>(type: string, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${type}` : type;
    if (!this.memo.forType.callable.has(key)) {
      this.memo.forType.callable.set(
        key,
        this.findSchemaForType(type)?.findCallableForType<T>(type, bindingType)
      );
    }
    return this.memo.forType.callable.get(key) as ODataCallable<T> | undefined;
  }

  public findEntitySetForType(type: string) {
    if (!this.memo.forType.entitySet.has(type)) {
      this.memo.forType.entitySet.set(
        type,
        this.findSchemaForType(type)?.findEntitySetForType(type)
      );
    }
    return this.memo.forType.entitySet.get(type) as ODataEntitySet | undefined;
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
        findOptionsForType: (type: string) => this.findOptionsForType(type),
        options: this.options.parserOptions,
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
    if (!this.memo.forType.entitySet.has(entityType)) {
      this.memo.forType.entitySet.set(
        entityType,
        this.schemas
          .reduce(
            (acc, schema) => [...acc, ...schema.entitySets],
            <ODataEntitySet[]>[]
          )
          .find((e) => e.entityType === entityType)
      );
    }
    return this.memo.forType.entitySet.get(entityType) as
      | ODataEntitySet
      | undefined;
  }

  public findServiceForEntityType(entityType: string) {
    return this.findEntitySetForEntityType(entityType)?.service as
      | typeof ODataEntityService
      | undefined;
  }

  public findEnumTypeByName<T>(name: string) {
    if (!this.memo.byName.enum.has(name)) {
      this.memo.byName.enum.set(
        name,
        this.schemas
          .reduce(
            (acc, schema) => [...acc, ...schema.enums],
            <ODataEnumType<T>[]>[]
          )
          .find((e) => e.name === name)
      );
    }
    return this.memo.byName.enum.get(name) as ODataEnumType<T> | undefined;
  }

  public findStructuredTypeByName<T>(name: string) {
    if (!this.memo.byName.structured.has(name)) {
      this.memo.byName.structured.set(
        name,
        this.schemas
          .reduce(
            (acc, schema) => [...acc, ...schema.entities],
            <ODataStructuredType<T>[]>[]
          )
          .find((e) => e.name === name)
      );
    }
    return this.memo.byName.structured.get(name) as
      | ODataStructuredType<T>
      | undefined;
  }

  public findCallableByName<T>(name: string, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${name}` : name;
    if (!this.memo.byName.callable.has(key)) {
      this.memo.byName.callable.set(
        key,
        this.schemas
          .reduce(
            (acc, schema) => [...acc, ...schema.callables],
            <ODataCallable<T>[]>[]
          )
          .find(
            (c) =>
              c.name === name &&
              (bindingType === undefined || c.binding()?.type === bindingType)
          )
      );
    }
    return this.memo.byName.callable.get(key) as ODataCallable<T> | undefined;
  }

  public findEntitySetByName(name: string) {
    if (!this.memo.byName.entitySet.has(name)) {
      this.memo.byName.entitySet.set(
        name,
        this.schemas
          .reduce(
            (acc, schema) => [...acc, ...schema.entitySets],
            <ODataEntitySet[]>[]
          )
          .find((e) => e.name === name)
      );
    }
    return this.memo.byName.entitySet.get(name) as ODataEntitySet | undefined;
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
    if (!this.memo.forType.parser.has(key)) {
      if (type in this.parsers) {
        // Edm, Base Parsers
        this.memo.forType.parser.set(key, this.parsers[type] as Parser<T>);
      } else if (!type.startsWith('Edm.')) {
        // EnumType, ComplexType and EntityType Parsers
        let value =
          this.findCallableForType<T>(type, bindingType) ||
          this.findEnumTypeForType<T>(type) ||
          this.findStructuredTypeForType<T>(type);
        this.memo.forType.parser.set(key, value?.parser as Parser<T>);
      } else {
        // None Parser
        this.memo.forType.parser.set(key, NONE_PARSER);
      }
    }
    return this.memo.forType.parser.get(key) as Parser<T>;
  }

  public findOptionsForType<T>(type: string) {
    // Strucutred Options
    if (!this.memo.forType.options.has(type)) {
      let st = this.findStructuredTypeForType<T>(type);
      this.memo.forType.options.set(
        type,
        st !== undefined && st.model !== undefined && st.model?.meta !== null
          ? st.model.meta
          : undefined
      );
    }
    return this.memo.forType.options.get(type) as
      | ODataModelOptions<T>
      | undefined;
  }
}
