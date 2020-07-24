import { ODataEntityParser, ODataFieldParser, ODataEnumParser, EDM_PARSERS } from '../parsers/index';
import { EntityConfig, EnumConfig, ServiceConfig, Schema, Container, Parser, Configuration } from '../types';
import { Types } from '../utils';
import { ODataModel } from './model';
import { ODataCollection } from './collection';

export class ODataConfig {
  name: string;
  serviceRootUrl: string;
  params: { [param: string]: string | string[] };
  headers: { [param: string]: string | string[] };
  metadataUrl?: string;
  withCredentials?: boolean;
  acceptMetadata?: 'minimal' | 'full' | 'none';
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
  creation?: Date;
  parsers?: {[type: string]: Parser<any>};
  schemas?: Array<ODataSchema>;

  constructor(config: Configuration) {
    this.serviceRootUrl = config.serviceRootUrl;
    if (this.serviceRootUrl.indexOf('?') != -1)
      throw new Error("The 'serviceRootUrl' should not contain query string. Please use 'params' to add extra parameters");
    if (!this.serviceRootUrl.endsWith('/'))
      this.serviceRootUrl += '/';
    this.name = config.name;
    this.params = config.params || {};
    this.headers = config.headers || {};
    this.metadataUrl = `${config.serviceRootUrl}$metadata`;
    this.creation = config.creation || new Date();
    this.withCredentials = config.withCredentials;
    this.acceptMetadata = config.acceptMetadata;
    this.ieee754Compatible = config.ieee754Compatible;
    this.stringAsEnum = config.stringAsEnum;
    this.parsers = config.parsers || EDM_PARSERS;

    this.schemas = (config.schemas || []).map(schema => new ODataSchema(schema));
  }
  
  configure() {
    this.schemas.forEach(schema => {
      schema.configure({ parserForType: (type: string) => this.parserForType(type) });
    });
  }

  deserialize<T>(type: string, value: any): Partial<T> | Partial<T>[] {
    let parser = this.parserForType<T>(type);
    if (!Types.isUndefined(parser) && 'deserialize' in parser)
      return Array.isArray(value) ? 
        value.map(v => parser.deserialize(v, {stringAsEnum: this.stringAsEnum, ieee754Compatible: this.ieee754Compatible})) as Partial<T>[]: 
        parser.deserialize(value, {stringAsEnum: this.stringAsEnum, ieee754Compatible: this.ieee754Compatible}) as Partial<T>;
    return value;
  }

  serialize<T>(type: string, entity: Partial<T> | Partial<T>[]): any {
    let parser = this.parserForType<T>(type);
    if (!Types.isUndefined(parser) && 'serialize' in parser)
      return Array.isArray(entity) ? 
        entity.map(e => parser.serialize(e, {stringAsEnum: this.stringAsEnum, ieee754Compatible: this.ieee754Compatible})) : 
        parser.serialize(entity, {stringAsEnum: this.stringAsEnum, ieee754Compatible: this.ieee754Compatible});
    return entity;
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
    let config = this.enumConfigForType(type) || this.entityConfigForType(type);
    if (!Types.isUndefined(config))
      return config.parser as Parser<T>;
  }
}

export class ODataSchema {
  namespace: string;
  enums?: Array<ODataEnumConfig<any>>;
  entities?: Array<ODataEntityConfig<any>>;
  containers?: Array<ODataContainer>;

  constructor(config: Schema) {
    this.namespace = config.namespace;
    this.enums = (config.enums || []).map(config => new ODataEnumConfig(config, this.namespace));
    this.entities = (config.entities || []).map(config => new ODataEntityConfig(config, this.namespace));
    this.containers = (config.containers || []).map(container => new ODataContainer(container, this.namespace));
  }

  get services(): Array<ODataServiceConfig> {
    return this.containers.reduce((acc, container) => [...acc, ...container.services], <ODataServiceConfig[]>[]);
  }

  configure(settings: {parserForType: (type: string) => Parser<any>}) {
    this.entities
      .forEach(config => config.configure(settings));
  }
}

export class ODataEnumConfig<Type> {
  name: string;
  type: string;
  parser?: ODataEnumParser<Type>;
  members: {[name: string]: number} | {[value: number]: string};
  constructor(config: EnumConfig<Type>, namespace: string) {
    this.name = config.name;
    this.members = config.members;
    this.type = `${namespace}.${this.name}`;
    this.parser = new ODataEnumParser(config as EnumConfig<any>, namespace);
  }
}

export class ODataEntityConfig<Type> {
  name: string;
  type: string;
  annotations: any[];
  model?: { new(...any): any };
  collection?: { new(...any): any };
  parser?: ODataEntityParser<Type>;

  constructor(config: EntityConfig<Type>, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${this.name}`;
    this.annotations = config.annotations;
    this.model = config.model;
    this.collection = config.collection;
    this.parser = new ODataEntityParser(config, namespace);
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

export class ODataContainer {
  name: string;
  type: string;
  annotations: any[];
  services?: Array<ODataServiceConfig>;
  constructor(config: Container, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${this.name}`;
    this.annotations = config.annotations;
    this.services = (config.services || []).map(config => new ODataServiceConfig(config, namespace));
  }
}

export class ODataServiceConfig {
  name: string;
  type: string;
  annotations: any[];
  constructor(config: ServiceConfig, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${this.name}`;
    this.annotations = config.annotations;
  }
}