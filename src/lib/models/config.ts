import { ODataEntityParser, ODataFieldParser, ODataParser, ODataEnumParser } from '../parsers';
import { EntityConfig, EnumConfig, ServiceConfig, ApiConfig, Parser } from '../types';
import { ODataModel } from './model';
import { ODataCollection } from './collection';

export interface ODataConfig {
  type: string;
  configure(settings: {parserForType: (type: string) => ODataParser<any>});
}

export class ODataApiConfig implements ODataConfig {
  type: string;
  constructor(meta: ApiConfig) {
  }

  configure(settings: {parserForType: (type: string) => ODataParser<any>}) {}
}

export class ODataEnumConfig<Type> implements ODataConfig {
  type: string;
  parser?: ODataEnumParser<Type>;
  members: {[name: string]: number} | {[value: number]: string};
  constructor(meta: EnumConfig<Type>, stringAsEnum: boolean) {
    this.type = meta.type;
    this.members = meta.members;
    this.parser = new ODataEnumParser(meta as EnumConfig<any>, stringAsEnum);
  }

  configure(settings: {parserForType: (type: string) => ODataParser<any>}) {}
}

export class ODataEntityConfig<Type> implements ODataConfig {
  type: string;
  parser?: ODataEntityParser<Type>;
  model?: { new(...any): any };
  collection?: { new(...any): any };

  constructor(meta: EntityConfig<Type>) {
    this.type = meta.type;
    this.parser = new ODataEntityParser(meta);
  }

  configure(settings: {parserForType: (type: string) => ODataParser<any>}) {
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

export class ODataServiceConfig<T> implements ODataConfig {
  type: string;
  constructor(meta: ServiceConfig<T>) {
    this.type = meta.type;
  }

  configure(settings: {parserForType: (type: string) => ODataParser<any>}) {}
}