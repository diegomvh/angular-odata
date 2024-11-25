import { ODataAnnotationConfig, Parser } from '../types';
import { Strings } from '../utils';
import { ODataAnnotatable } from './annotation';
import { ODataSchema } from './schema';

export class ODataSchemaElement extends ODataAnnotatable {
  name: string;
  schema: ODataSchema;

  constructor(
    config: { annotations?: ODataAnnotationConfig[]; name: string },
    schema: ODataSchema,
  ) {
    super(config);
    this.schema = schema;
    this.name = config.name;
  }

  get api() {
    return this.schema.api;
  }

  /**
   * Create a nicer looking title.
   * Titleize is meant for creating pretty output.
   * @param term The term of the annotation to find.
   * @returns The titleized string.
   */
  titleize(term?: string | RegExp): string {
    return (term && this.annotatedValue(term)) ?? Strings.titleCase(this.name);
  }

  /**
   * Returns a full type of the structured type including the namespace/alias.
   * @param alias Use the alias of the namespace instead of the namespace.
   * @returns The string representation of the type.
   */
  type({ alias = false }: { alias?: boolean } = {}) {
    return `${alias ? this.schema.alias : this.schema.namespace}.${this.name}`;
  }

  /**
   * Returns a boolean indicating if the structured type is of the given type.
   * @param type String representation of the type
   * @returns True if the callable is type of the given type
   */
  isTypeOf(element: ODataSchemaElement): boolean {
    const names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias) names.push(`${this.schema.alias}.${this.name}`);
    return names.includes(element.type());
  }

  /**
   * Returns a boolean indicating if the structured type is a subtype of the given type.
   * @param type String representation of the type
   * @returns True if the callable is type of the given type
   */
  isSubtypeOf(element: ODataSchemaElement): boolean {
    if (this.isTypeOf(element)) return true;
    return false;
  }

  /**
   * Returns a boolean indicating if the structured type is a supertype of the given type.
   * @param type String representation of the type
   * @returns True if the callable is type of the given type
   */
  isSupertypeOf(element: ODataSchemaElement): boolean {
    if (this.isTypeOf(element)) return true;
    return false;
  }
}

export class ODataParserSchemaElement<
  E,
  P extends Parser<E>,
> extends ODataSchemaElement {
  parser: P;
  constructor(
    config: { annotations?: ODataAnnotationConfig[]; name: string },
    schema: ODataSchema,
    parser: P,
  ) {
    super(config, schema);
    this.parser = parser;
  }
}
