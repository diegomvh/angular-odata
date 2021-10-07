import { EnumTypeConfig, Options } from '../types';
import { ODataEnumTypeFieldParser, ODataEnumTypeParser } from '../parsers';

import { ODataAnnotation } from './annotation';
import { ODataSchema } from './schema';

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
    this.parser = new ODataEnumTypeParser<E>(
      config,
      schema.namespace,
      schema.alias
    );
    this.annotations = (config.annotations || []).map(
      (annot) => new ODataAnnotation(annot)
    );
  }

  type({ alias = false }: { alias?: boolean } = {}) {
    return `${alias ? this.schema.alias : this.schema.namespace}.${this.name}`;
  }

  isTypeOf(type: string) {
    return this.parser.isTypeOf(type);
  }

  get api() {
    return this.schema.api;
  }

  configure() {
    this.parser.configure({ options: this.api.options });
  }

  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }

  fields(): ODataEnumTypeFieldParser[] {
    return this.parser.fields;
  }

  findFieldByName(name: string) {
    return this.fields().find((f) => f.name === name);
  }

  findFieldByValue(value: number) {
    return this.fields().find((f) => f.value === value);
  }

  fieldTitle(value: number | string, pattern?: RegExp) {
    const resolveTitle = (field?: ODataEnumTypeFieldParser) => {
      if (field !== undefined) {
        if (pattern !== undefined) {
          const annotation = field.findAnnotation((a) => pattern.test(a.term));
          if (annotation !== undefined && annotation.string !== undefined) {
            return annotation.string;
          }
        }
        return field.name;
      }
      return '';
    };
    if (typeof value === 'number') {
      return resolveTitle(this.findFieldByValue(value));
    } else {
      return resolveTitle(this.findFieldByName(value));
    }
  }

  mapFields<T>(mapper: (field: ODataEnumTypeFieldParser) => T) {
    return this.fields().map(mapper);
  }

  deserialize(value: any, options?: Options): E {
    return this.parser.deserialize(value, options);
  }

  serialize(value: E, options?: Options): any {
    return this.parser.serialize(value, options);
  }

  encode(value: E, options?: Options): any {
    return this.parser.encode(value, options);
  }
}
