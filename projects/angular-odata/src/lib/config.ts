import { EntityConfig, EnumConfig, ServiceConfig, Schema, Container, Parser, Configuration, CallableConfig, ParseOptions } from './types';
import { Types } from './utils';
import { ODataModel } from './models/model';
import { ODataCollection } from './models/collection';
import { ODataEnumParser } from './parsers/enum';
import { ODataEntityParser, ODataFieldParser } from './parsers/entity';
import { ODataCallableParser } from './parsers/callable';
import { EDM_PARSERS } from './parsers/edm';

export class ODataApiConfig {
  name: string;
  serviceRootUrl: string;
  version: string;
  params: { [param: string]: string | string[] };
  headers: { [param: string]: string | string[] };
  metadataUrl?: string;
  withCredentials?: boolean;
  metadata?: 'minimal' | 'full' | 'none';
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
  creation?: Date;
  parsers?: {[type: string]: Parser<any>};
  schemas?: Array<ODataSchemaConfig>;

  constructor(config: Configuration) {
    this.serviceRootUrl = config.serviceRootUrl;
    if (this.serviceRootUrl.indexOf('?') != -1)
      throw new Error("The 'serviceRootUrl' should not contain query string. Please use 'params' to add extra parameters");
    if (!this.serviceRootUrl.endsWith('/'))
      this.serviceRootUrl += '/';
    this.name = config.name;
    this.version = config.version;
    this.params = config.params || {};
    this.headers = config.headers || {};
    this.metadataUrl = `${config.serviceRootUrl}$metadata`;
    this.creation = config.creation || new Date();
    this.withCredentials = config.withCredentials;
    this.metadata = config.metadata || 'minimal';
    this.ieee754Compatible = config.ieee754Compatible;
    this.stringAsEnum = config.stringAsEnum;
    this.parsers = config.parsers || EDM_PARSERS;

    this.schemas = (config.schemas || []).map(schema => new ODataSchemaConfig(schema, this));
  }
  
  configure() {
    this.schemas.forEach(schema => {
      schema.configure({ parserForType: (type: string) => this.parserForType(type) });
    });
  }

  options(): ParseOptions {
    return {
      version: this.version,
      metadata: this.metadata,
      stringAsEnum: this.stringAsEnum,
      ieee754Compatible: this.ieee754Compatible
    }
  }

  //#region Find Config for Type
  private schemaForType(type: string) {
    let schema = this.schemas.find(s => type.startsWith(s.namespace));
    if (schema)
      return schema;
  }

  public enumConfigForType<T>(type: string) {
    let schema = this.schemaForType(type);
    if (schema)
      return schema.enums.find(e => e.type === type) as ODataEnumConfig<T>;
  }

  public entityConfigForType<T>(type: string) {
    let schema = this.schemaForType(type);
    if (schema)
      return schema.entities.find(e => e.type === type) as ODataEntityConfig<T>;
  }

  public callableConfigForType<T>(type: string) {
    let schema = this.schemaForType(type);
    if (schema)
      return schema.callables.find(e => e.type === type) as ODataCallableConfig<T>;
  }

  public serviceConfigForType(type: string) {
    let schema = this.schemaForType(type);
    if (schema) {
      return schema.services.find(s => s.type === type) as ODataServiceConfig;
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
    let config = this.enumConfigForType<T>(type) || this.entityConfigForType<T>(type) || this.callableConfigForType<T>(type);
    if (!Types.isUndefined(config))
      return config.parser as Parser<T>;
  }
}

export class ODataSchemaConfig {
  api: ODataApiConfig;
  namespace: string;
  enums?: Array<ODataEnumConfig<any>>;
  entities?: Array<ODataEntityConfig<any>>;
  callables?: Array<ODataCallableConfig<any>>;
  containers?: Array<ODataContainer>;

  constructor(schema: Schema, api: ODataApiConfig) {
    this.api = api;
    this.namespace = schema.namespace;
    this.enums = (schema.enums || []).map(config => new ODataEnumConfig(config, this));
    this.entities = (schema.entities || []).map(config => new ODataEntityConfig(config, this));
    // Merge callables
    let configs = (schema.callables || []);
    configs = configs.reduce((acc, config) => {
      if (acc.every(c => c.name !== config.name)) {
        config = configs.filter(c => c.name === config.name).reduce((acc, c) => { 
          acc.parameters = Object.assign(acc.parameters || {}, c.parameters || {});
          return acc;
        }, config);
        return [...acc, config];
      }
      return acc;
    }, []);
    this.callables = configs.map(config => new ODataCallableConfig(config, this));
    this.containers = (schema.containers || []).map(container => new ODataContainer(container, this));
  }

  options() {
    return this.api.options();
  }

  get services(): Array<ODataServiceConfig> {
    return this.containers.reduce((acc, container) => [...acc, ...container.services], <ODataServiceConfig[]>[]);
  }

  configure(settings: {parserForType: (type: string) => Parser<any>}) {
    // Configure Entities
    this.entities
      .forEach(config => config.configure(settings));
    // Configure callables
    this.callables
      .forEach(callable => callable.configure(settings));
  }
}

export class ODataEnumConfig<Type> {
  schema: ODataSchemaConfig;
  name: string;
  type: string;
  parser?: ODataEnumParser<Type>;
  members: {[name: string]: number} | {[value: number]: string};
  constructor(enu: EnumConfig<Type>, schema: ODataSchemaConfig) {
    this.schema = schema;
    this.name = enu.name;
    this.members = enu.members;
    this.type = `${schema.namespace}.${this.name}`;
    this.parser = new ODataEnumParser(enu as EnumConfig<any>, schema.namespace);
  }

  options() {
    return this.schema.options();
  }
}

export class ODataEntityConfig<Type> {
  schema: ODataSchemaConfig;
  name: string;
  type: string;
  annotations: any[];
  model?: { new(...any): any };
  collection?: { new(...any): any };
  parser?: ODataEntityParser<Type>;

  constructor(config: EntityConfig<Type>, schema: ODataSchemaConfig) {
    this.schema = schema;
    this.name = config.name;
    this.type = `${schema.namespace}.${this.name}`;
    this.annotations = config.annotations;
    this.model = config.model;
    this.collection = config.collection;
    this.parser = new ODataEntityParser(config, schema.namespace);
  }

  options() {
    return this.schema.options();
  }

  configure(settings: {parserForType: (type: string) => Parser<any>}) {
    this.parser.configure(settings);
  }

  fields(opts: {
    include_parents?: boolean,
    include_navigation?: boolean
  } = {include_navigation: true, include_parents: true}): ODataFieldParser<any>[] {
    let parent = this.parser as ODataEntityParser<any>;
    let fields = <ODataFieldParser<any>[]>[];
    while (parent) {
      fields = [
        ...parent.fields.filter(field => opts.include_navigation || !field.navigation),
        ...fields
      ];
      if (!opts.include_parents)
        break;
      parent = parent.parent;
    }
    return fields;
  }

  field<P extends keyof Type>(name: P): ODataFieldParser<Type[P]> {
    return this.fields().find(f => f.name === name);
  }
}

export class ODataCallableConfig<R> {
  schema: ODataSchemaConfig;
  name: string;
  type: string;
  path?: string;
  bound?: boolean;
  composable?: boolean;
  parser?: ODataCallableParser<R>;

  constructor(config: CallableConfig, schema: ODataSchemaConfig) {
    this.schema = schema;
    this.name = config.name;
    this.type = `${schema.namespace}.${config.name}`;
    this.path = config.path || (config.bound ? `${schema.namespace}.${config.name}` : config.name);
    this.bound = config.bound;
    this.composable = config.composable;
    this.parser = new ODataCallableParser(config, schema.namespace);
  }

  options() {
    return this.schema.options();
  }

  configure(settings: {parserForType: (type: string) => Parser<any>}) {
    this.parser.configure(settings);
  }
}

export class ODataContainer {
  schema: ODataSchemaConfig;
  name: string;
  type: string;
  annotations: any[];
  services?: Array<ODataServiceConfig>;
  constructor(config: Container, schema: ODataSchemaConfig) {
    this.schema = schema;
    this.name = config.name;
    this.type = `${schema.namespace}.${this.name}`;
    this.annotations = config.annotations;
    this.services = (config.services || []).map(config => new ODataServiceConfig(config, schema));
  }

  options() {
    return this.schema.options();
  }
}

export class ODataServiceConfig {
  schema: ODataSchemaConfig
  name: string;
  type: string;
  annotations: any[];
  constructor(config: ServiceConfig, schema: ODataSchemaConfig) {
    this.schema = schema;
    this.name = config.name;
    this.type = `${schema.namespace}.${this.name}`;
    this.annotations = config.annotations;
  }

  options() {
    return this.schema.options();
  }
}