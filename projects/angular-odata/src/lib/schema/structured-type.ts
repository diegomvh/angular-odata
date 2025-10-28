import { ODataCollection } from '../models/collection';
import { ODataModel } from '../models/model';
import { ParserOptions, ODataStructuredTypeConfig, ODataStructuredTypeFieldConfig } from '../types';
import { ODataParserSchemaElement } from './element';
import {
  JsonSchemaOptions,
  ODataEntityTypeKey,
  ODataStructuredTypeFieldParser,
  ODataStructuredTypeParser,
} from './parsers';
import { ODataSchema } from './schema';

export class ODataStructuredType<T> extends ODataParserSchemaElement<
  T,
  ODataStructuredTypeParser<T>
> {
  base?: string;
  parent?: ODataStructuredType<any>;
  children: ODataStructuredType<any>[] = [];
  model?: typeof ODataModel<any>;
  collection?: typeof ODataCollection<any, ODataModel<any>>;

  constructor(config: ODataStructuredTypeConfig, schema: ODataSchema) {
    super(config, schema, new ODataStructuredTypeParser(config, schema.namespace, schema.alias));
    this.base = config.base;
    this.model = config.model as typeof ODataModel<any>;
    this.collection = config.collection as typeof ODataCollection<any, ODataModel<any>>;
  }

  configure({ options }: { options: ParserOptions }) {
    if (this.base) {
      const parent = this.api.findStructuredType(this.base) as ODataStructuredType<any>;
      parent.children.push(this);
      this.parent = parent;
    }
    this.parser.configure({
      options,
      parserForType: (t: string) => this.api.parserForType(t),
    });
    if (this.model !== undefined) {
      this.api.configureModel<T>(this, this.model);
      if (this.collection !== undefined) {
        this.collection.model = this.model;
      }
    }
  }

  /**
   * Returns a boolean indicating if the structured type is a subtype of the given type.
   * @param type String representation of the type
   * @returns True if the callable is type of the given type
   */
  override isSubtypeOf(schema: ODataStructuredType<any>): boolean {
    return (
      super.isSubtypeOf(schema) || (this.parent !== undefined && this.parent.isSubtypeOf(schema))
    );
  }

  /**
   * Returns a boolean indicating if the structured type is a supertype of the given type.
   * @param type String representation of the type
   * @returns True if the callable is type of the given type
   */
  override isSupertypeOf(schema: ODataStructuredType<any>): boolean {
    return super.isSupertypeOf(schema) || this.children.some((c) => c.isSupertypeOf(schema));
  }

  /**
   * Returns a boolean indicating if the structured type has a simple key.
   * @returns True if the structured type has a simple key
   */
  isSimpleKey() {
    return this.keys().length === 1;
  }

  /**
   * Returns a boolean indicating if the structured type has a compound key.
   * @returns True if the structured type has a compound key.
   */
  isCompoundKey() {
    return this.keys().length > 1;
  }

  isOpenType() {
    return this.parser.isOpenType();
  }

  isEntityType() {
    return this.parser.isEntityType();
  }

  isComplexType() {
    return this.parser.isComplexType();
  }

  /**
   * Find the field parser for the given field name.
   * @param name Name of the field
   * @returns The field parser
   */
  field<F>(name: keyof T) {
    return this.parser.field<F>(name);
  }

  addField<F>(
    name: string,
    config: ODataStructuredTypeFieldConfig,
  ): ODataStructuredTypeFieldParser<F> {
    return this.parser.addField(name, config);
  }

  /**
   * Find a parent schema of the structured type.
   * @param predicate Function for evaluate the schemas in the hierarchy.
   * @returns The schema that matches the predicate.
   */
  findParentSchema(
    predicate: (p: ODataStructuredType<any>) => boolean,
  ): ODataStructuredType<any> | undefined {
    if (predicate(this)) return this as ODataStructuredType<any>;
    if (this.parent === undefined) return undefined;
    return this.parent.findParentSchema(predicate);
  }

  findChildSchema(
    predicate: (p: ODataStructuredType<any>) => boolean,
  ): ODataStructuredType<any> | undefined {
    if (predicate(this)) return this;
    let match: ODataStructuredType<any> | undefined;
    for (let ch of this.children) {
      match = ch.findChildSchema(predicate);
      if (match !== undefined) break;
    }
    return match;
  }

  /**
   * Find a parent schema of the structured type for the given field.
   * @param field Field that belongs to the structured type
   * @returns The schema of the field
   */
  findParentSchemaForField<E>(field: ODataStructuredTypeFieldParser<any>) {
    return this.findParentSchema(
      (p) =>
        p.fields({ include_parents: false, include_navigation: true }).find((f) => f === field) !==
        undefined,
    ) as ODataStructuredType<E>;
  }

  /**
   * Picks the fields from attributes.
   * @param attrs
   * @param include_parents Include the parent fields
   * @param include_navigation Include the navigation fields
   * @param include_etag Include the etag field
   * @returns The picked fields
   */
  pick(
    attrs: { [name: string]: any },
    {
      include_id = true,
      include_key = true,
      include_parents = true,
      include_navigation = false,
      include_computed = false,
      include_etag = true,
    }: {
      include_id?: boolean;
      include_key?: boolean;
      include_parents?: boolean;
      include_navigation?: boolean;
      include_computed?: boolean;
      include_etag?: boolean;
    } = {},
  ): Partial<T> {
    return this.parser.pick(attrs, {
      include_id,
      include_key,
      include_etag,
      include_navigation,
      include_computed,
      include_parents,
      options: this.api.options,
    });
  }

  /**
   * Deseialize the given value from the structured type.
   * @param value Value to deserialize
   * @param options Options for deserialization
   * @returns Deserialized value
   */
  deserialize(value: any, options?: ParserOptions): T {
    return this.parser.deserialize(value, options);
  }

  /**
   * Serialize the given value for the structured type.
   * @param value Value to serialize
   * @param options Options for serialization
   * @returns Serialized value
   */
  serialize(value: T, options?: ParserOptions): any {
    return this.parser.serialize(value, options);
  }

  /**
   * Encode the given value for the structured type.
   * @param value Value to encode
   * @param options Options for encoding
   * @returns Encoded value
   */
  encode(value: T, options?: ParserOptions): any {
    return this.parser.encode(value, options);
  }

  /**
   * Returns all fields of the structured type.
   * @param include_navigation Include navigation properties in the result.
   * @param include_parents Include the parent types in the result.
   * @returns All fields of the structured type.
   */
  fields({
    include_navigation,
    include_parents,
  }: {
    include_parents: boolean;
    include_navigation: boolean;
  }): ODataStructuredTypeFieldParser<any>[] {
    return this.parser.fields({ include_navigation, include_parents });
  }

  /**
   * Returns the keys of the structured type.
   * @param include_parents Include the parent fields
   * @returns The keys of the structured type
   */
  keys({
    include_parents = true,
  }: {
    include_parents?: boolean;
  } = {}): ODataEntityTypeKey[] {
    return this.parser.keys({ include_parents });
  }

  /**
   * Resolve the key of the structured type for the given value.
   * @param attrs Attributes of the value
   * @returns Resolved key
   */
  resolveKey(attrs: T | { [name: string]: any }) {
    return this.parser.resolveKey(attrs);
  }

  /**
   * Returns the defaults values for the structured type.
   * @returns Default values for the structured type
   */
  defaults() {
    return this.parser.defaults();
  }

  /**
   * Convert the structured type to json schema
   * @param options Options for json schema
   * @returns Json Schema
   */
  toJsonSchema(options: JsonSchemaOptions<T> = {}) {
    return this.parser.toJsonSchema(options);
  }

  /**
   * Validate the given value against the structured type.
   * @param attrs Attributes of the value
   * @param method Method to use for the process validation
   * @returns Object with the errors
   */
  validate(
    attrs: Partial<T>,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'modify';
      navigation?: boolean;
    } = {},
  ) {
    return this.parser.validate(attrs, { method, navigation });
  }
}
