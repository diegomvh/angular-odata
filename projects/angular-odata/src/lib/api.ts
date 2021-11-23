import { HttpEvent, HttpEventType } from '@angular/common/http';
import { NEVER, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ODataCache, ODataInMemoryCache } from './cache/index';
import { DEFAULT_VERSION } from './constants';
import {
  ModelOptions,
  ODataCollection,
  ODataModel,
  ODataModelOptions,
} from './models/index';
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
          return new ODataEntityResource(this, segments, query);
        } else {
          return new ODataEntitySetResource(this, segments, query);
        }
      case PathSegmentNames.navigationProperty:
        return new ODataNavigationPropertyResource(this, segments, query);
      case PathSegmentNames.singleton:
        return new ODataSingletonResource(this, segments, query);
      case PathSegmentNames.action:
        return new ODataActionResource(this, segments, query);
      case PathSegmentNames.function:
        return new ODataFunctionResource(this, segments, query);
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
   * @param name Name of the singleton
   * @returns
   */
  singleton<T>(name: string) {
    const type = this.findEntitySetByName(name)?.entityType;
    return ODataSingletonResource.factory<T>(
      this,
      name,
      type,
      new ODataPathSegments(),
      new ODataQueryOptions()
    );
  }

  /**
   * Build an entity set resource.
   * @param name Name of the entity set
   * @returns
   */
  entitySet<T>(name: string): ODataEntitySetResource<T> {
    const type = this.findEntitySetByName(name)?.entityType;
    return ODataEntitySetResource.factory<T>(
      this,
      name,
      type,
      new ODataPathSegments(),
      new ODataQueryOptions()
    );
  }

  /**
   * Unbound Action
   * @param  {string} name?
   * @returns ODataActionResource
   */
  action<P, R>(name: string): ODataActionResource<P, R> {
    let type;
    const callable = this.findCallableForType(name);
    if (callable !== undefined) {
      name = callable.path();
      type = callable.type();
    }
    return ODataActionResource.factory<P, R>(
      this,
      name,
      type,
      new ODataPathSegments(),
      new ODataQueryOptions()
    );
  }

  /**
   * Unbound Function
   * @param  {string} name?
   * @returns ODataFunctionResource
   */
  function<P, R>(name: string): ODataFunctionResource<P, R> {
    let type;
    const callable = this.findCallableForType(name);
    if (callable !== undefined) {
      name = callable.path();
      type = callable.type();
    }
    return ODataFunctionResource.factory<P, R>(
      this,
      name,
      type,
      new ODataPathSegments(),
      new ODataQueryOptions()
    );
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
      enum: { [type: string]: ODataEnumType<any> | undefined };
      structured: { [type: string]: ODataStructuredType<any> | undefined };
      callable: { [key: string]: ODataCallable<any> | undefined };
      entitySet: { [type: string]: ODataEntitySet | undefined };
      parser: { [type: string]: Parser<any> };
      options: { [type: string]: ODataModelOptions<any> | undefined };
    };
    byName: {
      enum: { [type: string]: ODataEnumType<any> | undefined };
      structured: { [type: string]: ODataStructuredType<any> | undefined };
      callable: { [key: string]: ODataCallable<any> | undefined };
      entitySet: { [type: string]: ODataEntitySet | undefined };
    };
  } = {
    forType: {
      enum: {},
      structured: {},
      callable: {},
      entitySet: {},
      parser: {},
      options: {},
    },
    byName: { enum: {}, structured: {}, callable: {}, entitySet: {} },
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
    if (!(type in this.memo.forType.enum))
      this.memo.forType.enum[type] =
        this.findSchemaForType(type)?.findEnumTypeForType<T>(type);
    return this.memo.forType.enum[type] as ODataEnumType<T> | undefined;
  }

  public findStructuredTypeForType<T>(type: string) {
    if (!(type in this.memo.forType.structured))
      this.memo.forType.structured[type] =
        this.findSchemaForType(type)?.findStructuredTypeForType<T>(type);
    return this.memo.forType.structured[type] as
      | ODataStructuredType<T>
      | undefined;
  }

  public findCallableForType<T>(type: string, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${type}` : type;
    if (!(key in this.memo.forType.callable))
      this.memo.forType.callable[key] = this.findSchemaForType(
        type
      )?.findCallableForType<T>(type, bindingType);
    return this.memo.forType.callable[key] as ODataCallable<T> | undefined;
  }

  public findEntitySetForType(type: string) {
    if (!(type in this.memo.forType.entitySet))
      this.memo.forType.entitySet[type] =
        this.findSchemaForType(type)?.findEntitySetForType(type);
    return this.memo.forType.entitySet[type] as ODataEntitySet | undefined;
  }

  public findModelForType(type: string) {
    return this.findStructuredTypeForType<any>(type)?.model;
  }

  public modelForType(type: string) {
    let Model = this.findModelForType(type);
    if (Model === undefined) {
      let schema = this.findStructuredTypeForType<any>(type);
      if (schema === undefined) throw Error('');
      Model = class extends ODataModel<any> {} as typeof ODataModel;
      let fields = schema
        .fields({ include_navigation: false, include_parents: false })
        .reduce((acc, f) => Object.assign(acc, { field: f.name }), {});
      Model.buildMeta({ fields } as ModelOptions, schema);
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
    }
    return Collection;
  }

  public findServiceForType(type: string) {
    return this.findEntitySetForType(type)?.service as
      | typeof ODataEntityService
      | undefined;
  }

  public findEntitySetForEntityType(entityType: string) {
    if (!(entityType in this.memo.forType.entitySet))
      this.memo.forType.entitySet[entityType] = this.schemas
        .reduce(
          (acc, schema) => [...acc, ...schema.entitySets],
          <ODataEntitySet[]>[]
        )
        .find((e) => e.entityType === entityType);
    return this.memo.forType.entitySet[entityType] as
      | ODataEntitySet
      | undefined;
  }

  public findServiceForEntityType(entityType: string) {
    return this.findEntitySetForEntityType(entityType)?.service as
      | typeof ODataEntityService
      | undefined;
  }

  public findEnumTypeByName<T>(name: string) {
    if (!(name in this.memo.byName.enum))
      this.memo.byName.enum[name] = this.schemas
        .reduce(
          (acc, schema) => [...acc, ...schema.enums],
          <ODataEnumType<T>[]>[]
        )
        .find((e) => e.name === name);
    return this.memo.byName.enum[name] as ODataEnumType<T> | undefined;
  }

  public findStructuredTypeByName<T>(name: string) {
    if (!(name in this.memo.byName.structured))
      this.memo.byName.structured[name] = this.schemas
        .reduce(
          (acc, schema) => [...acc, ...schema.entities],
          <ODataStructuredType<T>[]>[]
        )
        .find((e) => e.name === name);
    return this.memo.byName.structured[name] as
      | ODataStructuredType<T>
      | undefined;
  }

  public findCallableByName<T>(name: string, bindingType?: string) {
    const key = bindingType !== undefined ? `${bindingType}/${name}` : name;
    if (!(key in this.memo.byName.callable))
      this.memo.byName.callable[key] = this.schemas
        .reduce(
          (acc, schema) => [...acc, ...schema.callables],
          <ODataCallable<T>[]>[]
        )
        .find(
          (c) =>
            c.name === name &&
            (bindingType === undefined || c.binding()?.type === bindingType)
        );
    return this.memo.byName.callable[key] as ODataCallable<T> | undefined;
  }

  public findEntitySetByName(name: string) {
    if (!(name in this.memo.byName.entitySet))
      this.memo.byName.entitySet[name] = this.schemas
        .reduce(
          (acc, schema) => [...acc, ...schema.entitySets],
          <ODataEntitySet[]>[]
        )
        .find((e) => e.name === name);
    return this.memo.byName.entitySet[name] as ODataEntitySet | undefined;
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
    if (!(key in this.memo.forType.parser)) {
      if (type in this.parsers) {
        // Edm, Base Parsers
        this.memo.forType.parser[key] = this.parsers[type] as Parser<T>;
      } else if (!type.startsWith('Edm.')) {
        // EnumType, ComplexType and EntityType Parsers
        let value =
          this.findCallableForType<T>(type, bindingType) ||
          this.findEnumTypeForType<T>(type) ||
          this.findStructuredTypeForType<T>(type);
        this.memo.forType.parser[key] = value?.parser as Parser<T>;
      } else {
        // None Parser
        this.memo.forType.parser[key] = NONE_PARSER;
      }
    }
    return this.memo.forType.parser[key] as Parser<T>;
  }

  public findOptionsForType<T>(type: string) {
    // Strucutred Options
    if (!(type in this.memo.forType.options)) {
      let st = this.findStructuredTypeForType<T>(type);
      this.memo.forType.options[type] =
        st !== undefined && st.model !== undefined && st.model?.meta !== null
          ? st.model.meta
          : undefined;
    }
    return this.memo.forType.options[type] as ODataModelOptions<T> | undefined;
  }
}
