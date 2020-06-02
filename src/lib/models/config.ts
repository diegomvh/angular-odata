import { ODataEntityParser, ODataFieldParser, ODataParser, ODataEnumParser } from '../parsers';
import { EntityConfig, EnumConfig, ServiceConfig, Schema, Container, Parser, Configuration } from '../types';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  creation?: Date;
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
    this.withCredentials = config.withCredentials || false;
    this.acceptMetadata = config.acceptMetadata;
    this.stringAsEnum = config.stringAsEnum || false;
    this.creation = config.creation || new Date();

    this.schemas = config.schemas.map(schema => new ODataSchema(schema));
  }
  
  configure() {
    this.schemas
      .forEach(schmea => schmea.configure({
        stringAsEnum: this.stringAsEnum,
        parserForType: (type: string) => this.parserForType(type)
      })
    );
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

  public parserForType<T>(type: string): ODataParser<T> {
    let config = this.enumConfigForType(type) || this.entityConfigForType(type);
    if (!Types.isUndefined(config))
      return config.parser as ODataParser<T>;
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

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.enums
      .forEach(config => config.configure(settings));
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

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.parser.configure(settings);
  }
}

export class ODataEntityConfig<Type> {
  name: string;
  type: string;
  parser?: ODataEntityParser<Type>;
  model?: { new(...any): any };
  collection?: { new(...any): any };

  constructor(config: EntityConfig<Type>, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${this.name}`;
    this.parser = new ODataEntityParser(config, namespace);
  }

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.parser.configure(settings);
  }

  fields(include_parents: boolean = true): ODataFieldParser<any>[] {
    let parser = this.parser as ODataEntityParser<any>;
    let fields = [];
    while (parser) {
      fields = [...parser.fields, ...fields];
      if (!include_parents)
        break;
      parser = parser.parent;
    }
    return fields;
  }
}

export class ODataContainer {
  name: string;
  type: string;
  services?: Array<ODataServiceConfig>;
  constructor(config: Container, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${this.name}`;
    this.services = (config.services || []).map(config => new ODataServiceConfig(config, namespace));
  }

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.services
      .forEach(config => config.configure(settings));
  }
}

export class ODataServiceConfig {
  name: string;
  type: string;
  constructor(config: ServiceConfig, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${this.name}`;
  }

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {}
}