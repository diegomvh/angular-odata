import { HttpClient, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataOptions } from './options';
import { ApiConfig, Parser } from './types';
import { EDM_PARSERS } from './parsers/index';
import { ODataSchema, ODataEnumType, ODataCallable, ODataEntitySet, ODataStructuredType } from './schema/index';
import { ODataModel, ODataCollection } from './models/index';
import { Types } from './utils/index';
import { ODataRequest, ODataResponse } from './resources/index';
import { ODataCache, ODataCacheMemoryStorage } from './cache/index';

export class ODataApi {
  requester: (request: ODataRequest<any>) => Observable<any>;
  serviceRootUrl: string;
  metadataUrl?: string;
  name?: string;
  default?: boolean;
  creation?: Date;
  // Cache
  cache!: ODataCache;
  // Options
  options: ODataOptions;
  // Base Parsers
  parsers: { [type: string]: Parser<any> };
  // Schemas
  schemas: Array<ODataSchema>;

  constructor(http: HttpClient, config: ApiConfig) {
    this.serviceRootUrl = config.serviceRootUrl;
    if (this.serviceRootUrl.indexOf('?') != -1)
      throw new Error("The 'serviceRootUrl' should not contain query string. Please use 'params' to add extra parameters");
    if (!this.serviceRootUrl.endsWith('/'))
      this.serviceRootUrl += '/';
    this.metadataUrl = `${config.serviceRootUrl}$metadata`;
    this.name = config.name;
    this.default = config.default || false;
    this.creation = config.creation || new Date();
    this.options = new ODataOptions(config.options || {});

    this.cache = new ODataCache(config.cache || {
      storage: new ODataCacheMemoryStorage()
    });

    this.parsers = config.parsers || EDM_PARSERS;

    this.schemas = (config.schemas || []).map(schema => new ODataSchema(schema, this));

    this.requester = (req: ODataRequest<any>): Observable<any> => {
      return http.request(req.method, `${req.url}`, {
        body: req.body,
        headers: req.headers,
        observe: req.observe,
        params: req.params,
        reportProgress: req.reportProgress,
        responseType: req.responseType,
        withCredentials: req.withCredentials
      });
    }
  }

  configure() {
    this.schemas.forEach(schema => {
      schema.configure({ parserForType: (type: string) => this.parserForType(type) });
    });
  }

  request(req: ODataRequest<any>): Observable<ODataResponse<any> | HttpEvent<any>> {
    let res$ = this.requester(req);
    if (req.observe === 'events') {
      return res$;
    }
    res$ = res$.pipe(
      map((res: HttpResponse<any>) => new ODataResponse({
        body: res.body,
        api: req.api,
        headers: res.headers,
        status: res.status,
        statusText: res.statusText,
        resource: req.resource
      })
    ));

    return (this.cache.isCacheable(req)) ?
      this.cache.handle(req, res$) :
      res$;
  }

  //#region Find Config for Type
  private schemaForType(type: string): ODataSchema | null {
    let schemas = this.schemas.filter(s => s.isNamespaceOf(type));
    if (schemas.length === 1) return schemas[0];
    return schemas.sort((s1, s2) => s2.namespace.length - s1.namespace.length)[0] || null;
  }

  public enumTypeForType<T>(type: string) {
    let schema = this.schemaForType(type);
    return schema !== null ? schema.enums.find(e => e.isTypeOf(type)) as ODataEnumType<T> : null;
  }

  public structuredTypeForType<T>(type: string) {
    let schema = this.schemaForType(type);
    return schema !== null ? schema.entities.find(e => e.isTypeOf(type)) as ODataStructuredType<T> : null;
  }

  public callableForType<T>(type: string) {
    let schema = this.schemaForType(type);
    return schema !== null ? schema.callables.find(e => e.isTypeOf(type)) as ODataCallable<T> : null;
  }

  public entitySetForType(type: string) {
    let schema = this.schemaForType(type);
    return schema ? schema.services.find(e => e.isTypeOf(type)) as ODataEntitySet : null;
  }

  //#region Model and Collection for type
  public modelForType(type: string) {
    let schema = this.structuredTypeForType<any>(type);
    return schema ? schema.model as typeof ODataModel : null;
  }

  public collectionForType(type: string) {
    let schema = this.structuredTypeForType<any>(type);
    return schema ? schema.collection as typeof ODataCollection : null;
  }
  //#endregion
  //#endregion

  //#region Find Config for Name
  public enumTypeByName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.enums], <ODataEnumType<any>[]>[])
      .find(e => e.name === name);
  }

  public structuredTypeByName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.entities], <ODataStructuredType<any>[]>[])
      .find(e => e.name === name);
  }

  public callableByName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.callables], <ODataCallable<any>[]>[])
      .find(e => e.name === name);
  }

  public entitySetByName(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.services], <ODataEntitySet[]>[])
      .find(e => e.name === name);
  }

  //#region Model and Collection for type
  public modelByName(name: string) {
    let schema = this.structuredTypeByName(name);
    return schema !== undefined ? schema.model as typeof ODataModel : null;
  }

  public collectionByName(name: string) {
    let schema = this.structuredTypeByName(name);
    return schema !== undefined ? schema.collection as typeof ODataCollection : null;
  }
  //#endregion
  //#endregion

  public parserForType<T>(type: string) {
    if (type in this.parsers) {
      return this.parsers[type] as Parser<T>;
    }
    // Not edms here
    if (!type.startsWith("Edm.")) {
      let value = this.enumTypeForType<T>(type) || this.structuredTypeForType<T>(type) || this.callableForType<T>(type);
      return value ? value.parser as Parser<T> : null;
    }
    return null;
  }
}
