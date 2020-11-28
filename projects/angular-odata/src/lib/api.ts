import { ODataOptions } from './options';
import { ApiConfig, Parser } from './types';
import { EDM_PARSERS } from './parsers';
import { ODataSchema, ODataEnumType, ODataCallable, ODataEntitySet, ODataStructuredType } from './schema/index';
import { ODataModel, ODataCollection } from './models';
import { Types } from './utils';
import { ODataRequest, ODataResponse } from './resources';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpEvent, HttpResponse } from '@angular/common/http';
import { map, startWith, tap } from 'rxjs/operators';
import { ODataCache } from './cache';

export class ODataApi {
  requester: (request: ODataRequest<any>) => Observable<any>;
  serviceRootUrl: string;
  metadataUrl?: string;
  name?: string;
  default?: boolean;
  creation?: Date;
  // Cache
  cache?: ODataCache;
  // Options
  options: ODataOptions;
  // Base Parsers
  parsers?: { [type: string]: Parser<any> };
  // Schemas
  schemas?: Array<ODataSchema>;

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
    this.options = new ODataOptions(config.options);
    this.cache = config.cache;
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
        config: req.api,
        headers: res.headers,
        status: res.status,
        statusText: res.statusText,
        resource: req.resource
      })
    ));

    if (!this.cache)
      return res$;

    if (!this.cache.isCacheable(req)) {
      return res$;
    }

    const cached = this.cache.get(req);
    res$ = res$.pipe(tap((res: ODataResponse<any>) => this.cache.put(req, res)));
    return cached ?
      (req.headers.get('x-refresh') ? res$.pipe(startWith(cached)) : of(cached)) :
      res$;
  }

  //#region Find Config for Type
  private schemaForType(type: string) {
    let schemas = this.schemas.filter(s => s.isNamespaceOf(type));
    if (schemas.length === 1) return schemas[0];
    return schemas.sort((s1, s2) => s2.namespace.length - s1.namespace.length)[0];
  }

  public enumTypeForType<T>(type: string) {
    let schema = this.schemaForType(type);
    if (schema)
      return schema.enums.find(e => e.isTypeOf(type)) as ODataEnumType<T>;
  }

  public structuredTypeForType<T>(type: string) {
    let schema = this.schemaForType(type);
    if (schema)
      return schema.entities.find(e => e.isTypeOf(type)) as ODataStructuredType<T>;
  }

  public callableForType<T>(type: string) {
    let schema = this.schemaForType(type);
    if (schema)
      return schema.callables.find(e => e.isTypeOf(type)) as ODataCallable<T>;
  }

  public entitySetForType(type: string) {
    let schema = this.schemaForType(type);
    if (schema) {
      return schema.services.find(s => s.isTypeOf(type)) as ODataEntitySet;
    }
  }

  //#region Model and Collection for type
  public modelForType(type: string): typeof ODataModel {
    let schema = this.structuredTypeForType(type);
    if (!Types.isUndefined(schema))
      return schema.model as typeof ODataModel;
  }

  public collectionForType(type: string): typeof ODataCollection {
    let schema = this.structuredTypeForType(type);
    if (!Types.isUndefined(schema))
      return schema.collection as typeof ODataCollection;
  }
  //#endregion
  //#endregion

  //#region Find Config for Name
  public enumTypeByName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.enums], <ODataEnumType<any>[]>[])
      .find(e => e.name === name) as ODataEnumType<T>;
  }

  public structuredTypeByName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.entities], <ODataStructuredType<any>[]>[])
      .find(e => e.name === name) as ODataStructuredType<T>;
  }

  public callableByName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.callables], <ODataCallable<any>[]>[])
      .find(e => e.name === name) as ODataCallable<T>;
  }

  public entitySetByName(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.services], <ODataEntitySet[]>[])
      .find(e => e.name === name) as ODataEntitySet;
  }

  //#region Model and Collection for type
  public modelByName(name: string): typeof ODataModel {
    let schema = this.structuredTypeByName(name);
    if (!Types.isUndefined(schema))
      return schema.model as typeof ODataModel;
  }

  public collectionByName(name: string): typeof ODataCollection {
    let schema = this.structuredTypeByName(name);
    if (!Types.isUndefined(schema))
      return schema.collection as typeof ODataCollection;
  }
  //#endregion
  //#endregion

  public parserForType<T>(type: string): Parser<T> {
    if (type in this.parsers) {
      return this.parsers[type] as Parser<T>;
    }
    // Not edms here
    if (!type.startsWith("Edm.")) {
      let value = this.enumTypeForType<T>(type) || this.structuredTypeForType<T>(type) || this.callableForType<T>(type);
      if (!Types.isUndefined(value))
        return value.parser as Parser<T>;
    }
  }
}
