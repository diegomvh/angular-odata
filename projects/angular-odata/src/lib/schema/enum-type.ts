import { ODataSchema } from './schema';
import { ODataEnumTypeFieldParser, ODataEnumTypeParser } from '../parsers';
import { Annotation, EnumTypeConfig } from '../types';
import { ODataAnnotation } from './annotation';

export class ODataEnumType<E> {
  schema: ODataSchema;
  name: string;
  parser: ODataEnumTypeParser<E>;
  members: { [name: string]: number } | { [value: number]: string };
  annotations: ODataAnnotation[];
  constructor(config: EnumTypeConfig<E>, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.members = config.members;
    this.parser = new ODataEnumTypeParser<E>(config, schema.namespace);
    this.annotations = (config.annotations || []).map(annot => new ODataAnnotation(annot));
  }

  isTypeOf(type: string) {
    var names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias)
      names.push(`${this.schema.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  get api() {
    return this.schema.api;
  }

  findAnnotation(predicate: (annot: Annotation) => boolean) {
    return this.annotations.find(predicate);
  }
  fields(): ODataEnumTypeFieldParser[] {
    return this.parser.fields;
  }

  findFieldByName(name: string) {
    return this.fields().find(f => f.name === name);
  }

  findFieldByValue(value: number) {
    return this.fields().find(f => f.value === value);
  }

  mapFields<T>(mapper: (field: ODataEnumTypeFieldParser) => T) {
    return this.fields().map(mapper);
  }
}
