import { HttpClient, HttpEvent, HttpResponse } from '@angular/common/http';
import { NEVER, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataOptions } from './options';
import { ApiConfig, Parser } from './types';
import { EDM_PARSERS } from './parsers/index';
import { ODataSchema, ODataEnumType, ODataCallable, ODataEntitySet, ODataStructuredType } from './schema/index';
import { ODataModel, ODataCollection } from './models/index';
import { ODataRequest, ODataResponse } from './resources/index';
import { ODataCache, ODataCacheMemoryStorage } from './cache/index';

export class ODataApi {
  requester?: (request: ODataRequest<any>) => Observable<any>;
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

  constructor(config: ApiConfig) {
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
  }

  configure(settings: { requester?: (request: ODataRequest<any>) => Observable<any> } = {}) {
    this.requester = settings.requester;
    this.schemas.forEach(schema => {
      schema.configure({ findParserForType: (type: string) => this.findParserForType(type) });
    });
  }

  request(req: ODataRequest<any>): Observable<ODataResponse<any> | HttpEvent<any>> {
    let res$ = this.requester !== undefined ? this.requester(req) : NEVER;
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
  private findSchemaForType(type: string) {
    let schemas = this.schemas.filter(s => s.isNamespaceOf(type));
    if (schemas.length > 1)
      return schemas.sort((s1, s2) => s1.namespace.length - s2.namespace.length).pop();
    if (schemas.length === 1) return schemas[0];
    return undefined;
  }

  public findEnumTypeForType(type: string) {
    let schema = this.findSchemaForType(type);
    return schema !== undefined ? schema.enums.find(e => e.isTypeOf(type)) : undefined;
  }

  public findStructuredTypeForType(type: string) {
    let schema = this.findSchemaForType(type);
    return schema !== undefined ? schema.entities.find(e => e.isTypeOf(type)) : undefined;
  }

  public findCallableForType(type: string) {
    let schema = this.findSchemaForType(type);
    return schema !== undefined ? schema.callables.find(e => e.isTypeOf(type)) : undefined;
  }

  public findEntitySetForType(type: string) {
    let schema = this.findSchemaForType(type);
    return schema !== undefined ? schema.services.find(e => e.isTypeOf(type)) : undefined;
  }

  //#region Model and Collection for type
  public findModelForType(type: string) {
    let schema = this.findStructuredTypeForType(type);
    return schema !== undefined ? schema.model as typeof ODataModel : undefined;
  }

  public findCollectionForType(type: string) {
    let schema = this.findStructuredTypeForType(type);
    return schema !== undefined ? schema.collection as typeof ODataCollection : undefined;
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

  public findParserForType<T>(type: string) {
    if (type in this.parsers) {
      return this.parsers[type] as Parser<T>;
    }
    // Not edms here
    if (!type.startsWith("Edm.")) {
      let value = this.findEnumTypeForType(type) || this.findStructuredTypeForType(type) || this.findCallableForType(type);
      return value !== undefined ? value.parser as Parser<T> : undefined;
    }
    return undefined;
  }
}
