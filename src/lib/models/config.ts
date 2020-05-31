import { ODataEntityParser, ODataFieldParser, ODataParser, ODataEnumParser } from '../parsers';
import { EntityConfig, EnumConfig, ServiceConfig, Schema, Container, Parser, Configuration } from '../types';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Types } from '../utils';
import { ODataModel } from './model';
import { ODataCollection } from './collection';

export class ODataConfig {
  serviceRootUrl: string;
  params: { [param: string]: string | string[] };
  metadataUrl?: string;
  withCredentials?: boolean;
  acceptMetadata?: 'minimal' | 'full' | 'none';
  creation?: Date;
  version?: string;
  stringAsEnum?: boolean;
  schemas?: Array<ODataSchema>;
  errorHandler?: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: Configuration) {
    this.serviceRootUrl = config.serviceRootUrl;
    if (this.serviceRootUrl.indexOf('?') != -1)
      throw new Error("The 'serviceRootUrl' should not contain query string. Please use 'params' to add extra parameters");
    if (!this.serviceRootUrl.endsWith('/'))
      this.serviceRootUrl += '/';
    this.params = config.params || {};
    this.metadataUrl = `${config.serviceRootUrl}$metadata`;
    this.withCredentials = config.withCredentials || false;
    this.acceptMetadata = config.acceptMetadata;
    this.stringAsEnum = config.stringAsEnum || false;
    this.creation = config.creation || new Date();
    this.errorHandler = config.errorHandler || null;

    this.schemas = config.schemas.map(schema => new ODataSchema(schema));

    this.schemas.forEach(schema => schema.configure({
      stringAsEnum: this.stringAsEnum, 
      parserForType: (type: string) => this.parserForType(type)
    }));
  }
  
  private schemaForType(type: string) {
    let schema = this.schemas.find(s => type.startsWith(s.namespace));
    if (schema)
      return schema;
  }

  //#region Find Config
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
      return schema.serviceConfigForType(type);
    }
  }
  //#endregion

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
    this.enums = (config.enums || []).map(config => new ODataEnumConfig(config));
    this.entities = (config.entities || []).map(config => new ODataEntityConfig(config));
    this.containers = (config.containers || []).map(container => new ODataContainer(container));
  }

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.enums
      .forEach(config => config.configure(Object.assign({namespace: this.namespace}, settings)));
    this.entities
      .forEach(config => config.configure(Object.assign({namespace: this.namespace}, settings)));
  }

  serviceConfigForType(type: string) {
    for (var container of this.containers) {
      var config = container.services.find(s => s.type === type) as ODataServiceConfig;
      if (config) return config;
    }
  }
}

export class ODataEnumConfig<Type> {
  name: string;
  type: string;
  parser?: ODataEnumParser<Type>;
  members: {[name: string]: number} | {[value: number]: string};
  constructor(config: EnumConfig<Type>) {
    this.name = config.name;
    this.members = config.members;
    this.parser = new ODataEnumParser(config as EnumConfig<any>);
  }

  configure(settings: {namespace: string, stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.type = `${settings.namespace}.${this.name}`;
    this.parser.configure(settings);
  }
}

export class ODataEntityConfig<Type> {
  name: string;
  type: string;
  parser?: ODataEntityParser<Type>;
  model?: { new(...any): any };
  collection?: { new(...any): any };

  constructor(config: EntityConfig<Type>) {
    this.name = config.name;
    this.parser = new ODataEntityParser(config);
  }

  configure(settings: {namespace: string, stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.type = `${settings.namespace}.${this.name}`;
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
  services?: Array<ODataServiceConfig>
  constructor(config: Container) {
    this.name = config.name;
    this.services = (config.services || []).map(config => new ODataServiceConfig(config));
  }

  configure(settings: {namespace: string, stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.services
      .forEach(config => config.configure(settings));
  }
}

export class ODataServiceConfig {
  name: string;
  type: string;
  constructor(config: ServiceConfig) {
    this.name = config.name;
  }

  configure(settings: {namespace: string, stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.type = `${settings.namespace}.${this.name}`;
  }
}