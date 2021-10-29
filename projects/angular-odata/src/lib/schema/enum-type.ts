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

  /**
   * Returns a full type of the enum type including the namespace/alias.
   * @param alias Use the alias of the namespace instead of the namespace.
   * @returns The string representation of the type.
   */
  type({ alias = false }: { alias?: boolean } = {}) {
    return `${alias ? this.schema.alias : this.schema.namespace}.${this.name}`;
  }

  /**
   * Returns a boolean indicating if the enum type is of the given type.
   * @param type String representation of the type
   * @returns True if the callable is type of the given type
   */
  isTypeOf(type: string) {
    return this.parser.isTypeOf(type);
  }

  get api() {
    return this.schema.api;
  }

  configure() {
    this.parser.configure({ options: this.api.options });
  }

  /**
   * Find an annotation inside the enum type.
   * @param predicate Function that returns true if the annotation match.
   * @returns The annotation that matches the predicate.
   */
  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }

  /**
   * Returns the fields of the enum type.
   * @returns The fields of the enum type.
   */
  fields(): ODataEnumTypeFieldParser[] {
    return this.parser.fields;
  }

  /**
   * Find a field by name.
   * @param name The name of the field
   * @returns The field with the given name
   */
  findFieldByName(name: string) {
    return this.fields().find((f) => f.name === name);
  }

  /**
   * Find a field by value.
   * @param value The value of the field
   * @returns The field with the given value
   */
  findFieldByValue(value: number) {
    return this.fields().find((f) => f.value === value);
  }

  /**
   * Find a title for a given value.
   * @param value Value of the field
   * @param pattern Pattern to use for find in annotations
   * @returns The name or annotation of the filed that matches with the value.
   */
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

  /**
   * Map the fields of the enum type.
   * @param mapper Function that maps the value to the new value
   * @returns The fields mapped by the mapper
   */
  mapFields<T>(mapper: (field: ODataEnumTypeFieldParser) => T) {
    return this.fields().map(mapper);
  }

  /**
   * Deseialize the given value from the enum type.
   * @param value Value to deserialize
   * @param options Options for deserialization
   * @returns Deserialized value
   */
  deserialize(value: any, options?: Options): E {
    return this.parser.deserialize(value, options);
  }

  /**
   * Serialize the given value for the enum type.
   * @param value Value to serialize
   * @param options Options for serialization
   * @returns Serialized value
   */
  serialize(value: E, options?: Options): any {
    return this.parser.serialize(value, options);
  }

  /**
   * Encode the given value for the enum type.
   * @param value Value to encode
   * @param options Options for encoding
   * @returns Encoded value
   */
  encode(value: E, options?: Options): any {
    return this.parser.encode(value, options);
  }
}
