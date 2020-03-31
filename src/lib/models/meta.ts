import { ODataParser, ODataField } from './parser';
import { Meta } from '../types';
import { ODataModel } from './model';
import { ODataCollection } from './collection';

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

  configure(type: string, settings: {
    parsers?: {[type: string]: ODataParser<any> },
    metas?: {[type: string]: ODataMeta<any> },
    models?: {[type: string]: { new(...any): ODataModel<any>} },
    collections?:{[type: string]: { new(...any): ODataCollection<any, ODataModel<any>> } }
  }) {
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