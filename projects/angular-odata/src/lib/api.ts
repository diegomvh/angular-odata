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
  version?: string;
  default: boolean;
  creation: Date;
  // Cache
  cache!: ODataCache;
  // Options
  options: ODataOptions;
  // Base Parsers
  parsers: { [type: string]: Parser<any> };
  // Schemas
  schemas: ODataSchema[];

  constructor(config: ApiConfig) {
    this.serviceRootUrl = config.serviceRootUrl;
    if (this.serviceRootUrl.indexOf('?') != -1)
      throw new Error("The 'serviceRootUrl' should not contain query string. Please use 'params' to add extra parameters");
    if (!this.serviceRootUrl.endsWith('/'))
      this.serviceRootUrl += '/';
    this.metadataUrl = `${config.serviceRootUrl}$metadata`;
    this.name = config.name;
    this.version = config.version;
    this.default = config.default || false;
    this.creation = config.creation || new Date();
    this.options = new ODataOptions(Object.assign({version: this.version}, config.options || {}));

    this.cache = new ODataCache(config.cache || {});

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

  //#region Find Schema for Type
  private findSchemaForType(type: string) {
    const schemas = this.schemas.filter(s => s.isNamespaceOf(type));
    if (schemas.length > 1)
      return schemas.sort((s1, s2) => s1.namespace.length - s2.namespace.length).pop();
    if (schemas.length === 1) return schemas[0];
    return undefined;
  }

  public findEnumTypeForType(type: string) {
    const schema = this.findSchemaForType(type);
    return schema?.findEnumTypeForType(type);
  }

  public findStructuredTypeForType(type: string) {
    const schema = this.findSchemaForType(type);
    return schema?.findStructuredTypeForType(type);
  }

  public findCallableForType(type: string) {
    const schema = this.findSchemaForType(type);
    return schema?.findCallableForType(type);
  }

  public findEntitySetForType(type: string) {
    const schema = this.findSchemaForType(type);
    return schema?.findEntitySetForType(type);
  }

  //#region Model and Collection for type
  public findModelForType(type: string) {
    const schema = this.findStructuredTypeForType(type);
    return schema?.model as typeof ODataModel;
  }

  public findCollectionForType(type: string) {
    const schema = this.findStructuredTypeForType(type);
    return schema?.collection as typeof ODataCollection;
  }
  //#endregion
  //#endregion

  //#region Find Config for Name
  public findEnumTypeByName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.enums], <ODataEnumType<any>[]>[])
      .find(e => e.name === name);
  }

  public findStructuredTypeByName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.entities], <ODataStructuredType<any>[]>[])
      .find(e => e.name === name);
  }

  public findCallableByName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.callables], <ODataCallable<any>[]>[])
      .find(e => e.name === name);
  }

  public findEntitySetByName(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.entitySets], <ODataEntitySet[]>[])
      .find(e => e.name === name);
  }

  //#region Model and Collection for type
  public findModelByName(name: string) {
    let schema = this.findStructuredTypeByName(name);
    return schema !== undefined ? schema.model as typeof ODataModel : null;
  }

  public findCollectionByName(name: string) {
    let schema = this.findStructuredTypeByName(name);
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
