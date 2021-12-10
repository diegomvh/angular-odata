import { EnumTypeConfig, Options } from '../types';
import { ODataSchemaElement } from './element';
import { ODataEnumTypeFieldParser, ODataEnumTypeParser } from './parsers';
import { ODataSchema } from './schema';

export class ODataEnumType<E> extends ODataSchemaElement {
  parser: ODataEnumTypeParser<E>;
  members: { [name: string]: number } | { [value: number]: string };
  constructor(config: EnumTypeConfig<E>, schema: ODataSchema) {
    super(config, schema);
    this.members = config.members;
    this.parser = new ODataEnumTypeParser<E>(
      config,
      schema.namespace,
      schema.alias
    );
  }

  configure() {
    this.parser.configure({ options: this.api.options });
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
