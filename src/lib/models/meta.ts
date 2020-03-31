import { ODataSettings } from './settings';
import { ODataParser, ODataField } from './parser';
import { Meta } from '../types';


export class ODataMeta<Type> {
  type: string;
  base: string;
  set: string;
  parser?: ODataParser<Type>;
  parent?: ODataMeta<any>;
  model?: { new(...any): any };
  collection?: { new(...any): any };

  constructor(meta: Meta) {
    this.type = meta.type;
    this.base = meta.base;
    this.set = meta.set;
  }

  configure(type: string, settings: ODataSettings) {
    if (this.type && this.type !== type)
      throw new Error(`Can't configure ${this.type} with ${type}`);
    this.type = type;
    if (this.type in settings.models) {
      this.model = settings.models[this.type];
    }
    if (this.type in settings.collections) {
      this.collection = settings.collections[this.type];
    }
    if (this.base in settings.metas) {
      this.parent = settings.metas[this.base];
    }
    this.parser = settings.parsers[this.type] as ODataParser<Type>;
    this.parser.configure(type, { stringAsEnum: settings.stringAsEnum, enums: settings.enums, parsers: settings.parsers });
  }

  fields(include_parents: boolean = true): ODataField<any>[] {
    let parser = this.parser as ODataParser<any>;
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