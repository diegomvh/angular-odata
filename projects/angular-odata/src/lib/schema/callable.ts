import { CallableConfig, ParserOptions } from '../types';
import { ODataParserSchemaElement } from './element';
import { ODataCallableParser } from './parsers';
import { ODataSchema } from './schema';

export class ODataCallable<R> extends ODataParserSchemaElement<R, ODataCallableParser<R>> {
  entitySetPath?: string;
  bound?: boolean;
  composable?: boolean;

  constructor(config: CallableConfig, schema: ODataSchema) {
    super(config, schema, new ODataCallableParser(
      config,
      schema.namespace,
      schema.alias,
    ));
    this.entitySetPath = config.entitySetPath;
    this.bound = config.bound;
    this.composable = config.composable;
  }

  path() {
    let path: string;
    if (this.entitySetPath) path = this.entitySetPath;
    else if (this.bound) path = `${this.schema.namespace}.${this.name}`;
    else
      path = this.parser.return
        ? this.api.findEntitySetForType(this.parser.return.type)?.name ||
          this.name
        : this.name;
    return path;
  }

  configure({
    options,
  }: {
    options: ParserOptions;
  }) {
    this.parser.configure({
      options,
      parserForType: (t: string) => this.api.parserForType(t)
    });
  }

  /**
   * Deseialize the given value from the callable.
   * @param value Value to deserialize
   * @param options Options for deserialization
   * @returns Deserialized value
   */
  deserialize(value: any, options?: ParserOptions): any {
    return this.parser.deserialize(value, options);
  }

  /**
   * Serialize the given value for the callable.
   * @param value Value to serialize
   * @param options Options for serialization
   * @returns Serialized value
   */
  serialize(value: any, options?: ParserOptions): any {
    return this.parser.serialize(value, options);
  }

  /**
   * Encode the given value for the callable.
   * @param value Value to encode
   * @param options Options for encoding
   * @returns Encoded value
   */
  encode(value: any, options?: ParserOptions): any {
    return this.parser.encode(value, options);
  }

  /**
   * Returns the binding parameter of the callable.
   * @returns The binding parameter of the callable.
   */
  binding() {
    return this.parser.binding();
  }

  returnType() {
    return this.parser.returnType(); 
  }
}
