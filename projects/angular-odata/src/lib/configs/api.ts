import { ODataOptions } from './options';
import { ApiConfig, Parser } from '../types';
import { EDM_PARSERS } from '../parsers';
import { ODataSchemaConfig } from './schema';
import { ODataEnumConfig } from './enum';
import { ODataEntityConfig } from './entity';
import { ODataCallableConfig } from './callable';
import { ODataServiceConfig } from './service';
import { ODataModel, ODataCollection } from '../models';
import { Types } from '../utils';

export class ODataApiConfig {
  serviceRootUrl: string;
  metadataUrl?: string;
  name?: string;
  default?: boolean;
  creation?: Date;
  // Http
  params: { [param: string]: string | string[] };
  headers: { [param: string]: string | string[] };
  withCredentials?: boolean;
  // Options
  options: ODataOptions;
  // Base Parsers
  parsers?: { [type: string]: Parser<any> };
  // Schemas
  schemas?: Array<ODataSchemaConfig>;

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
    this.params = config.params || {};
    this.headers = config.headers || {};
    this.withCredentials = config.withCredentials;
    this.options = new ODataOptions(config);
    this.parsers = config.parsers || EDM_PARSERS;

    this.schemas = (config.schemas || []).map(schema => new ODataSchemaConfig(schema, this));
  }

  configure() {
    this.schemas.forEach(schema => {
      schema.configure({ parserForType: (type: string) => this.parserForType(type) });
    });
  }

  //#region Find Config for Type
  private schemaForType(type: string) {
    let schemas = this.schemas.filter(s => s.isNamespaceOf(type));
    if (schemas.length === 1) return schemas[0];
    return schemas.sort((s1, s2) => s2.namespace.length - s1.namespace.length)[0];
  }

  public enumConfigForType<T>(type: string) {
    let schema = this.schemaForType(type);
    if (schema)
      return schema.enums.find(e => e.isTypeOf(type)) as ODataEnumConfig<T>;
  }

  public entityConfigForType<T>(type: string) {
    let schema = this.schemaForType(type);
    if (schema)
      return schema.entities.find(e => e.isTypeOf(type)) as ODataEntityConfig<T>;
  }

  public callableConfigForType<T>(type: string) {
    let schema = this.schemaForType(type);
    if (schema)
      return schema.callables.find(e => e.isTypeOf(type)) as ODataCallableConfig<T>;
  }

  public serviceConfigForType(type: string) {
    let schema = this.schemaForType(type);
    if (schema) {
      return schema.services.find(s => s.isTypeOf(type)) as ODataServiceConfig;
    }
  }

  //#region Model and Collection for type
  public modelForType(type: string): typeof ODataModel {
    let config = this.entityConfigForType(type);
    if (!Types.isUndefined(config))
      return config.model as typeof ODataModel;
  }

  public collectionForType(type: string): typeof ODataCollection {
    let config = this.entityConfigForType(type);
    if (!Types.isUndefined(config))
      return config.collection as typeof ODataCollection;
  }
  //#endregion
  //#endregion

  //#region Find Config for Name
  public enumConfigForName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.enums], <ODataEnumConfig<any>[]>[])
      .find(e => e.name === name) as ODataEnumConfig<T>;
  }

  public entityConfigForName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.entities], <ODataEntityConfig<any>[]>[])
      .find(e => e.name === name) as ODataEntityConfig<T>;
  }

  public callableConfigForName<T>(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.callables], <ODataCallableConfig<any>[]>[])
      .find(e => e.name === name) as ODataCallableConfig<T>;
  }

  public serviceConfigForName(name: string) {
    return this.schemas.reduce((acc, schema) => [...acc, ...schema.services], <ODataServiceConfig[]>[])
      .find(e => e.name === name) as ODataServiceConfig;
  }

  //#region Model and Collection for type
  public modelForName(name: string): typeof ODataModel {
    let config = this.entityConfigForName(name);
    if (!Types.isUndefined(config))
      return config.model as typeof ODataModel;
  }

  public collectionForName(name: string): typeof ODataCollection {
    let config = this.entityConfigForName(name);
    if (!Types.isUndefined(config))
      return config.collection as typeof ODataCollection;
  }
  //#endregion
  //#endregion

  public parserForType<T>(type: string): Parser<T> {
    if (type in this.parsers) {
      return this.parsers[type] as Parser<T>;
    }
    // Not edms here
    if (!type.startsWith("Edm.")) {
      let config = this.enumConfigForType<T>(type) || this.entityConfigForType<T>(type) || this.callableConfigForType<T>(type);
      if (!Types.isUndefined(config))
        return config.parser as Parser<T>;
    }
  }
}