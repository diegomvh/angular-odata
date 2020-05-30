import { ODataEntityParser, ODataFieldParser, ODataParser, ODataEnumParser } from '../parsers';
import { EntityConfig, EnumConfig, ServiceConfig, Schema, Container, Parser } from '../types';

export class ODataSchema {
  namespace: string;
  enums?: {[type: string]: ODataEnumConfig<any> };
  entities?: {[type: string]: ODataEntityConfig<any> };
  containers?: {[type: string]: ODataContainer };
  constructor(config: Schema) {
    this.namespace = config.namespace;
    this.enums = Object.entries(config.enums || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataEnumConfig(config)}), {});

    this.entities = Object.entries(config.entities || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataEntityConfig(config)}), {});

    this.containers = Object.entries(config.containers || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataContainer(config)}), {});
  }

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    Object.entries(this.enums)
      .forEach(([, config]) => config.configure(Object.assign({namespace: this.namespace}, settings)));
    Object.entries(this.entities)
      .forEach(([, config]) => config.configure(Object.assign({namespace: this.namespace}, settings)));
  }

  public configFor(name: string) {
    if (name in this.enums)
      return this.enums[name];
    else if (name in this.entities)
      return this.entities[name];
    //TODO: Buscar en los contenedores
  }
}

export class ODataEnumConfig<Type> {
  name: string;
  parser?: ODataEnumParser<Type>;
  members: {[name: string]: number} | {[value: number]: string};
  constructor(config: EnumConfig<Type>) {
    this.name = config.name;
    this.members = config.members;
    this.parser = new ODataEnumParser(config as EnumConfig<any>);
  }

  configure(settings: {namespace: string, stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.parser.configure(settings);
  }
}

export class ODataEntityConfig<Type> {
  name: string;
  parser?: ODataEntityParser<Type>;
  model?: { new(...any): any };
  collection?: { new(...any): any };

  constructor(config: EntityConfig<Type>) {
    this.name = config.name;
    this.parser = new ODataEntityParser(config);
  }

  configure(settings: {namespace: string, stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
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
  type: string;
  services?: {[type: string]: ODataServiceConfig };
  constructor(config: Container) {
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