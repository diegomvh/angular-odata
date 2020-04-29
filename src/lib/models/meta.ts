import { ODataEntityParser, ODataFieldParser, ODataParser } from '../parsers';
import { MetaEntity } from '../types';
import { ODataModel } from './model';
import { ODataCollection } from './collection';

export class ODataMetaEntity<Type> {
  type: string;
  base: string;
  set: {name: string };
  parser?: ODataParser<Type>;
  parent?: ODataMetaEntity<any>;
  model?: { new(...any): any };
  collection?: { new(...any): any };

  constructor(meta: MetaEntity<Type>) {
    this.type = meta.type;
    this.base = meta.base;
    this.set = meta.set;
  }

  configure(settings: {
    parsers?: {[type: string]: ODataParser<any> },
    metas?: {[type: string]: ODataMetaEntity<any> },
    models?: {[type: string]: { new(...any): ODataModel<any>} },
    collections?:{[type: string]: { new(...any): ODataCollection<any, ODataModel<any>> } }
  }) {
    if (settings.parsers && this.type in settings.parsers) {
      this.parser = settings.parsers[this.type] as ODataEntityParser<Type>;
    }
    if (settings.metas && this.base in settings.metas) {
      this.parent = settings.metas[this.base];
    }
    if (settings.models && this.type in settings.models) {
      this.model = settings.models[this.type];
    }
    if (settings.collections && this.type in settings.collections) {
      this.collection = settings.collections[this.type];
    }
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