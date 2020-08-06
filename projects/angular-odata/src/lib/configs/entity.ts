import { ODataFieldParser, ODataEntityParser } from '../parsers';
import { Parser, EntityConfig } from '../types';
import { ODataSchemaConfig } from './schema';

export class ODataEntityConfig<Type> {
  schema: ODataSchemaConfig;
  name: string;
  annotations: any[];
  model?: { new(...any): any };
  collection?: { new(...any): any };
  parser?: ODataEntityParser<Type>;

  constructor(config: EntityConfig<Type>, schema: ODataSchemaConfig) {
    this.schema = schema;
    this.name = config.name;
    this.annotations = config.annotations;
    this.model = config.model;
    this.collection = config.collection;
    this.parser = new ODataEntityParser(config, schema.namespace, schema.alias);
  }

  isTypeOf(type: string) {
    var names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias)
      names.push(`${this.schema.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  get options() {
    return this.schema.options;
  }

  configure(settings: { parserForType: (type: string) => Parser<any> }) {
    this.parser.configure(settings);
  }

  fields(opts: {
    include_parents?: boolean,
    include_navigation?: boolean
  } = { include_navigation: true, include_parents: true }): ODataFieldParser<any>[] {
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
