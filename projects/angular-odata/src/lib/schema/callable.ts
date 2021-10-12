import { CallableConfig, Options, Parser } from '../types';

import { ODataCallableParser } from '../parsers';
import { ODataSchema } from './schema';

export class ODataCallable<R> {
  schema: ODataSchema;
  name: string;
  entitySetPath?: string;
  bound?: boolean;
  composable?: boolean;
  parser: ODataCallableParser<R>;

  constructor(config: CallableConfig, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.entitySetPath = config.entitySetPath;
    this.bound = config.bound;
    this.composable = config.composable;
    this.parser = new ODataCallableParser(
      config,
      schema.namespace,
      schema.alias
    );
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

  /**
   * Returns a full type of the callable including the namespace/alias.
   * @param alias Use the alias of the namespace instead of the namespace.
   * @returns The string representation of the type.
   */
  type({ alias = false }: { alias?: boolean } = {}) {
    return `${alias ? this.schema.alias : this.schema.namespace}.${this.name}`;
  }

  /**
   * Returns a boolean indicating if the callable is of the given type.
   * @param type String representation of the type
   * @returns True if the callable is type of the given type
   */
  isTypeOf(type: string) {
    return this.parser.isTypeOf(type);
  }

  get api() {
    return this.schema.api;
  }

  configure({
    parserForType,
  }: {
    parserForType: (type: string) => Parser<any>;
  }) {
    this.parser.configure({ options: this.api.options, parserForType });
  }

  /**
   * Deseialize the given value from the callable.
   * @param value Value to deserialize
   * @param options Options for deserialization
   * @returns Deserialized value
   */
  deserialize(value: any, options?: Options): any {
    return this.parser.deserialize(value, options);
  }

  /**
   * Serialize the given value for the callable.
   * @param value Value to serialize
   * @param options Options for serialization
   * @returns Serialized value
   */
  serialize(value: any, options?: Options): any {
    return this.parser.serialize(value, options);
  }

  /**
   * Encode the given value for the callable.
   * @param value Value to encode
   * @param options Options for encoding
   * @returns Encoded value
   */
  encode(value: any, options?: Options): any {
    return this.parser.encode(value, options);
  }

  /**
   * Returns the binding parameter of the callable.
   * @returns The binding parameter of the callable.
   */
  binding() {
    return this.parser.binding();
  }
}
