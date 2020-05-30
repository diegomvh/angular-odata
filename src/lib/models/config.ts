import { ODataEntityParser, ODataFieldParser, ODataParser, ODataEnumParser } from '../parsers';
import { EntityConfig, EnumConfig, ServiceConfig, Schema, Container, Parser } from '../types';

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
  services?: {[type: string]: ODataServiceConfig };
  constructor(config: Container) {
    this.name = config.name;
    this.services = Object.entries(config.services || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataServiceConfig(config)}), {});
  }

  configure(settings: {namespace: string, stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    Object.entries(this.services)
      .forEach(([, config]) => config.configure(settings));
  }
}

export class ODataServiceConfig {
  name: string;
  constructor(config: ServiceConfig) {
    this.name = config.name;
  }

  configure(settings: {namespace: string, stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
  }
}