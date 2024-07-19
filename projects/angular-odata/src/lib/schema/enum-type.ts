import { EnumTypeConfig, ParserOptions } from '../types';
import { ODataParserSchemaElement } from './element';
import { ODataEnumTypeFieldParser, ODataEnumTypeParser } from './parsers';
import { ODataSchema } from './schema';

export class ODataEnumType<E> extends ODataParserSchemaElement<
  E,
  ODataEnumTypeParser<E>
> {
  members: { [name: string]: E } | { [value: number]: string };
  constructor(config: EnumTypeConfig<E>, schema: ODataSchema) {
    super(
      config,
      schema,
      new ODataEnumTypeParser<E>(config, schema.namespace, schema.alias),
    );
    this.members = config.members;
  }

  configure({ options }: { options: ParserOptions }) {
    this.parser.configure({ options });
  }

  /**
   * Returns the fields of the enum type.
   * @returns The fields of the enum type.
   */
  fields(value?: E): ODataEnumTypeFieldParser<E>[] {
    return this.parser.fields(value);
  }

  /**
   * Find a field by name or value.
   * @param enu The name or value of the field
   * @returns The field with the given name or value
   */
  field(enu: string | E) {
    return this.parser.field(enu);
  }

  /**
   * Map the fields of the enum type.
   * @param mapper Function that maps the value to the new value
   * @returns The fields mapped by the mapper
   */
  mapFields<T>(mapper: (field: ODataEnumTypeFieldParser<E>) => T) {
    return this.parser.mapFields(mapper);
  }

  /**
   * Deseialize the given value from the enum type.
   * @param value Value to deserialize
   * @param options Options for deserialization
   * @returns Deserialized value
   */
  deserialize(value: any, options?: ParserOptions): E {
    return this.parser.deserialize(value, options);
  }

  /**
   * Serialize the given value for the enum type.
   * @param value Value to serialize
   * @param options Options for serialization
   * @returns Serialized value
   */
  serialize(value: E, options?: ParserOptions): any {
    return this.parser.serialize(value, options);
  }

  /**
   * Encode the given value for the enum type.
   * @param value Value to encode
   * @param options Options for encoding
   * @returns Encoded value
   */
  encode(value: E, options?: ParserOptions): any {
    return this.parser.encode(value, options);
  }

  unpack(value: E) {
    return this.parser.unpack(value);
  }

  pack(value: number[]) {
    return this.parser.pack(value);
  }
}
