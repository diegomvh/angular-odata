import { ODataSchema } from './schema';
import { ODataEnumTypeFieldParser, ODataEnumTypeParser } from '../parsers';
import { EnumTypeConfig } from '../types';
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
    this.parser = new ODataEnumTypeParser<E>(config, schema.namespace, schema.alias);
    this.annotations = (config.annotations || []).map(annot => new ODataAnnotation(annot));
  }
  type({alias = false}: {alias?: boolean} = {}) {
    return `${alias ? this.schema.alias : this.schema.namespace}.${this.name}`;
  }
  isTypeOf(type: string) {
    return this.parser.isTypeOf(type);
  }
  get api() {
    return this.schema.api;
  }

  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
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
