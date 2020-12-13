import { ODataSchema } from './schema';
import { ODataEnumFieldParser, ODataEnumParser } from '../parsers';
import { EnumTypeConfig } from '../types';
import { ODataAnnotation } from './annotation';

export class ODataEnumType<E> {
  schema: ODataSchema;
  name: string;
  parser: ODataEnumParser<E>;
  members: { [name: string]: number } | { [value: number]: string };
  annotations: ODataAnnotation[];
  constructor(config: EnumTypeConfig<E>, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.members = config.members;
    this.parser = new ODataEnumParser<E>(config, schema.namespace);
    this.annotations = (config.annotations || []).map(annot => new ODataAnnotation(annot));
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

  fields(): ODataEnumFieldParser<E>[] {
    return this.parser.fields;
  }

  findFieldByName(name: string) {
    return this.fields().find(f => f.name === name);
  }

  findFieldByValue(value: number) {
    return this.fields().find(f => f.value === value);
  }

  mapFields<T>(mapper: (field: ODataEnumFieldParser<E>) => T) {
    return this.fields().map(mapper);
  }
}
