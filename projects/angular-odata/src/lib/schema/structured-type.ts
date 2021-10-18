import {
  JsonSchemaOptions,
  ODataEntityTypeKey,
  ODataStructuredTypeFieldParser,
  ODataStructuredTypeParser,
} from '../parsers';
import { Options, StructuredTypeConfig } from '../types';

import { ODataAnnotation } from './annotation';
import { ODataCollection } from '../models';
import { ODataModel } from '../models/model';
import { ODataSchema } from './schema';

export class ODataStructuredType<T> {
  name: string;
  schema: ODataSchema;
  base?: string;
  open: boolean;
  parent?: ODataStructuredType<any>;
  children: ODataStructuredType<any>[] = [];
  model?: typeof ODataModel;
  collection?: typeof ODataCollection;
  parser: ODataStructuredTypeParser<T>;
  annotations: ODataAnnotation[];

  constructor(config: StructuredTypeConfig<T>, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.base = config.base;
    this.open = config.open || false;
    this.parser = new ODataStructuredTypeParser(
      config,
      schema.namespace,
      schema.alias
    );
    this.annotations = (config.annotations || []).map(
      (annot) => new ODataAnnotation(annot)
    );
    this.model = config.model as typeof ODataModel;
    this.collection = config.collection as typeof ODataCollection;
    if (this.model !== undefined) {
      const options = this.model.hasOwnProperty('options')
        ? this.model.options
        : { fields: {} };
      this.model.buildMeta<T>(options, this);
    }
    if (this.collection !== undefined) {
      this.collection.model = this.model;
    }
  }

  get api() {
    return this.schema.api;
  }

  configure({
    parserForType,
    findOptionsForType,
  }: {
    parserForType: (type: string) => any;
    findOptionsForType: (type: string) => any;
  }) {
    if (this.base) {
      const parent = this.api.findStructuredTypeForType(
        this.base
      ) as ODataStructuredType<any>;
      parent.children.push(this);
      this.parent = parent;
    }
    this.parser.configure({ options: this.api.options, parserForType });
    if (this.model !== undefined && this.model.options !== null) {
      this.model.meta.configure({
        findOptionsForType,
      });
    }
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
  isTypeOf(type: string) {
    return this.parser.isTypeOf(type);
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

  /**
   * Find an annotation inside the structured type
   * @param predicate Function that returns true if the annotation match.
   * @returns The annotation that matches the predicate.
   */
  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }

  findParentSchema(
    predicate: (p: ODataStructuredType<any>) => boolean
  ): ODataStructuredType<any> | undefined {
    if (predicate(this)) return this;
    if (this.parent === undefined) return undefined;
    return this.parent.findParentSchema(predicate);
  }

  /**
   * Find the field parser for the given field name.
   * @param name Name of the field
   * @returns The field parser
   */
  findFieldByName(
    name: keyof T,
    {
      include_navigation,
      include_parents,
    }: {
      include_parents: boolean;
      include_navigation: boolean;
    }
  ) {
    return this.fields({ include_parents, include_navigation }).find(
      (f) => f.name === name
    );
  }

  findSchemaForField(field: ODataStructuredTypeFieldParser<any>) {
    return this.findParentSchema(
      (p) =>
        p
          .fields({ include_parents: false, include_navigation: true })
          .find((f) => f === field) !== undefined
    );
  }

  fields({
    include_navigation,
    include_parents,
  }: {
    include_parents: boolean;
    include_navigation: boolean;
  }): ODataStructuredTypeFieldParser<any>[] {
    return [
      ...(include_parents && this.parent !== undefined
        ? this.parent.fields({ include_parents, include_navigation })
        : []),
      ...this.parser.fields.filter(
        (field) => include_navigation || !field.navigation
      ),
    ];
  }

  keys({
    include_parents = true,
  }: {
    include_parents?: boolean;
  } = {}): ODataEntityTypeKey[] {
    return [
      ...(include_parents && this.parent !== undefined
        ? this.parent.keys({ include_parents })
        : []),
      ...(this.parser.keys || []),
    ];
  }

  pick(
    value: { [name: string]: any },
    {
      include_parents = true,
      include_navigation = false,
      include_etag = true,
    }: {
      include_parents?: boolean;
      include_navigation?: boolean;
      include_etag?: boolean;
    } = {}
  ): Partial<T> {
    const names = this.fields({ include_parents, include_navigation }).map(
      (f) => f.name
    );
    let attrs = Object.keys(value)
      .filter((k) => names.indexOf(k) !== -1)
      .reduce((acc, k) => Object.assign(acc, { [k]: value[k] }), {});
    if (include_etag) {
      const etag = this.api.options.helper.etag(value);
      this.api.options.helper.etag(attrs, etag);
    }
    return attrs;
  }

  /**
   * Deseialize the given value from the structured type.
   * @param value Value to deserialize
   * @param options Options for deserialization
   * @returns Deserialized value
   */
  deserialize(value: any, options?: Options): T {
    return this.parser.deserialize(value, options);
  }

  /**
   * Serialize the given value for the structured type.
   * @param value Value to serialize
   * @param options Options for serialization
   * @returns Serialized value
   */
  serialize(value: T, options?: Options): any {
    return this.parser.serialize(value, options);
  }

  /**
   * Encode the given value for the structured type.
   * @param value Value to encode
   * @param options Options for encoding
   * @returns Encoded value
   */
  encode(value: T, options?: Options): any {
    return this.parser.encode(value, options);
  }

  resolveKey(attrs: T | { [name: string]: any }) {
    return this.parser.resolveKey(attrs);
  }

  defaults() {
    return this.parser.defaults();
  }

  toJsonSchema(options: JsonSchemaOptions<T> = {}) {
    return this.parser.toJsonSchema(options);
  }

  validate(
    attrs: Partial<T>,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'modify';
      navigation?: boolean;
    } = {}
  ) {
    return this.parser.validate(attrs, { method, navigation });
  }
}
