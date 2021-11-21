import { Objects, Strings, Types } from '../../utils';
import {
  Parser,
  StructuredTypeFieldConfig,
  StructuredTypeConfig,
  OptionsHelper,
  NONE_PARSER,
  StructuredTypeFieldOptions,
  Options,
} from '../../types';
import { ODataEnumTypeParser } from './enum-type';
import { COMPUTED, DESCRIPTION, LONG_DESCRIPTION } from '../../constants';
import { ODataAnnotatable } from '../base';
import { raw } from '../../resources/query';
import { ODataParserOptions } from '../../options';

// JSON SCHEMA
type JsonSchemaSelect<T> = Array<keyof T>;
type JsonSchemaCustom<T> = {
  [P in keyof T]?: (
    schema: any,
    field: ODataStructuredTypeFieldParser<T[P]>
  ) => any;
};
type JsonSchemaExpand<T> = { [P in keyof T]?: JsonSchemaOptions<T[P]> };
type JsonSchemaRequired<T> = { [P in keyof T]?: boolean };
export type JsonSchemaOptions<T> = {
  select?: JsonSchemaSelect<T>;
  custom?: JsonSchemaCustom<T>;
  expand?: JsonSchemaExpand<T>;
  required?: JsonSchemaRequired<T>;
};

export class ODataEntityTypeKey {
  name: string;
  alias?: string;
  constructor({ name, alias }: { name: string; alias?: string }) {
    this.name = name;
    this.alias = alias;
  }
}

export class ODataReferential {
  property: string;
  referencedProperty: string;
  constructor({
    property,
    referencedProperty,
  }: {
    property: string;
    referencedProperty: string;
  }) {
    this.property = property;
    this.referencedProperty = referencedProperty;
  }
}

export class ODataStructuredTypeFieldParser<T>
  extends ODataAnnotatable
  implements Parser<T>
{
  name: string;
  private structuredType: ODataStructuredTypeParser<any>;
  type: string;
  private parser: Parser<T>;
  default?: any;
  maxLength?: number;
  collection: boolean;
  nullable: boolean;
  navigation: boolean;
  precision?: number;
  scale?: number;
  referentials: ODataReferential[];
  optionsHelper?: OptionsHelper;

  constructor(
    name: string,
    structuredType: ODataStructuredTypeParser<any>,
    field: StructuredTypeFieldConfig
  ) {
    super(field);
    this.name = name;
    this.structuredType = structuredType;
    this.type = field.type;
    this.parser = NONE_PARSER;
    this.referentials = (field.referentials || []).map(
      (referential) => new ODataReferential(referential)
    );
    this.default = field.default;
    this.maxLength = field.maxLength;
    this.nullable = field.nullable !== undefined ? field.nullable : true;
    this.collection = Boolean(field.collection);
    this.navigation = Boolean(field.navigation);
    this.precision = field.precision;
    this.scale = field.scale;
  }

  validate(
    value: any,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'modify';
      navigation?: boolean;
    } = {}
  ):
    | { [name: string]: any }
    | { [name: string]: any }[]
    | string[]
    | undefined {
    let errors;
    if (this.collection && Array.isArray(value)) {
      errors = value.map((v) => this.validate(v, { method, navigation })) as {
        [name: string]: any[];
      }[];
    } else if (
      (this.isStructuredType() &&
        typeof value === 'object' &&
        value !== null) ||
      (this.navigation && value !== undefined)
    ) {
      errors =
        this.structured().validate(value, { method, navigation }) ||
        ({} as { [name: string]: any[] });
    } else if (
      this.isEnumType() &&
      (typeof value === 'string' || typeof value === 'number')
    ) {
      errors = this.enum().validate(value, { method, navigation });
    } else {
      // IsEdmType
      const computed = this.annotatedValue<boolean>(COMPUTED);
      errors = [];
      if (
        !this.nullable &&
        (value === null || (value === undefined && method !== 'modify')) && // Is null or undefined without patch?
        !(computed && method === 'create') // Not (Is Computed field and create) ?
      ) {
        errors.push(`required`);
      }
      if (
        this.maxLength !== undefined &&
        typeof value === 'string' &&
        value.length > this.maxLength
      ) {
        errors.push(`maxlength`);
      }
    }
    return !Types.isEmpty(errors) ? errors : undefined;
  }

  //#region Deserialize
  private parse(
    parser: ODataStructuredTypeParser<T>,
    value: any,
    options?: OptionsHelper
  ): any {
    const type = Types.isPlainObject(value)
      ? options?.helper.type(value)
      : undefined;
    if (type !== undefined) {
      return parser
        .childParser((c) => c.isTypeOf(type))
        .deserialize(value, options);
    }
    return parser.deserialize(value, options);
  }

  deserialize(value: any, options?: Options): T {
    const parserOptions =
      options !== undefined
        ? new ODataParserOptions(options)
        : this.optionsHelper;
    if (this.parser instanceof ODataStructuredTypeParser) {
      const parser = this.parser as ODataStructuredTypeParser<T>;
      return Array.isArray(value)
        ? value.map((v) => this.parse(parser, v, parserOptions))
        : this.parse(parser, value, parserOptions);
    }
    return this.parser.deserialize(value, {
      field: this,
      ...parserOptions,
    } as StructuredTypeFieldOptions);
  }
  //#endregion

  //#region Serialize
  private toJson(
    parser: ODataStructuredTypeParser<T>,
    value: any,
    options?: OptionsHelper
  ): any {
    const type = Types.isPlainObject(value)
      ? options?.helper.type(value)
      : undefined;
    if (type !== undefined) {
      return parser
        .childParser((c) => c.isTypeOf(type))
        .serialize(value, options);
    }
    return parser.serialize(value, options);
  }

  serialize(value: T, options?: Options): any {
    const parserOptions =
      options !== undefined
        ? new ODataParserOptions(options)
        : this.optionsHelper;
    if (this.parser instanceof ODataStructuredTypeParser) {
      const parser = this.parser as ODataStructuredTypeParser<T>;
      return Array.isArray(value)
        ? (value as any[]).map((v) => this.toJson(parser, v, parserOptions))
        : this.toJson(parser, value, parserOptions);
    }
    return this.parser.serialize(value, {
      field: this,
      ...parserOptions,
    } as StructuredTypeFieldOptions);
  }
  //#endregion

  //#region Encode
  encode(value: T, options?: Options): string {
    const parserOptions =
      options !== undefined
        ? new ODataParserOptions(options)
        : this.optionsHelper;
    return this.parser.encode(value, {
      field: this,
      ...parserOptions,
    } as StructuredTypeFieldOptions);
  }
  //#endregion

  configure({
    parserForType,
    options,
  }: {
    parserForType: (type: string) => Parser<any>;
    options: OptionsHelper;
  }) {
    this.optionsHelper = options;
    this.parser = parserForType(this.type);
    if (this.default !== undefined) {
      this.default = this.deserialize(this.default, options);
    }
  }

  //#region Json Schema
  // https://json-schema.org/
  toJsonSchema(options: JsonSchemaOptions<T> = {}) {
    let schema: any =
      this.parser instanceof ODataStructuredTypeFieldParser ||
      this.parser instanceof ODataStructuredTypeParser ||
      this.parser instanceof ODataEnumTypeParser
        ? this.parser.toJsonSchema(options)
        : ({ title: this.name, type: 'object' } as any);

    if (
      [
        'Edm.String',
        'Edm.Date',
        'Edm.TimeOfDay',
        'Edm.DateTimeOffset',
        'Edm.Guid',
        'Edm.Binary',
      ].indexOf(this.type) !== -1
    ) {
      schema.type = 'string';
      if (this.type === 'Edm.Date') schema.format = 'date';
      else if (this.type === 'Edm.TimeOfDay') schema.format = 'time';
      else if (this.type === 'Edm.DateTimeOffset') schema.format = 'date-time';
      else if (this.type === 'Edm.Guid')
        schema.pattern =
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
      else if (this.type === 'Edm.Binary') schema.contentEncoding = 'base64';
      else if (this.type === 'Edm.String' && this.maxLength)
        schema.maxLength = this.maxLength;
    } else if (
      ['Edm.Int64', 'Edm.Int32', 'Edm.Int16', 'Edm.Byte', 'Edm.SByte'].indexOf(
        this.type
      ) !== -1
    ) {
      //TODO: Range
      schema.type = 'integer';
    } else if (['Edm.Decimal', 'Edm.Double'].indexOf(this.type) !== -1) {
      schema.type = 'number';
    } else if (['Edm.Boolean'].indexOf(this.type) !== -1) {
      schema.type = 'boolean';
    }
    if (this.default) schema.default = this.default;
    if (this.nullable) schema.type = [schema.type, 'null'];
    if (this.collection)
      schema = {
        type: 'array',
        items: schema,
        additionalItems: false,
      };
    return schema;
  }
  //#endregion

  isKey() {
    return (
      this.structuredType.keys?.find((k) => k.name === this.name) !== undefined
    );
  }

  hasReferentials() {
    return this.referentials.length !== 0;
  }

  isEdmType() {
    return this.type.startsWith('Edm.');
  }

  isEnumType() {
    return this.parser instanceof ODataEnumTypeParser;
  }

  enum() {
    if (!this.isEnumType()) throw new Error('Field are not EnumType');
    return this.parser as ODataEnumTypeParser<T>;
  }

  isStructuredType() {
    return this.parser instanceof ODataStructuredTypeParser;
  }

  structured() {
    if (!this.isStructuredType())
      throw new Error('Field are not StrucuturedType');
    return this.parser as ODataStructuredTypeParser<T>;
  }
}

export class ODataStructuredTypeParser<T>
  extends ODataAnnotatable
  implements Parser<T>
{
  name: string;
  namespace: string;
  open: boolean;
  children: ODataStructuredTypeParser<any>[] = [];
  alias?: string;
  base?: string;
  parent?: ODataStructuredTypeParser<any>;
  keys?: ODataEntityTypeKey[];
  fields: ODataStructuredTypeFieldParser<any>[];
  optionsHelper?: OptionsHelper;

  constructor(
    config: StructuredTypeConfig<T>,
    namespace: string,
    alias?: string
  ) {
    super(config);
    this.name = config.name;
    this.base = config.base;
    this.open = config.open || false;
    this.namespace = namespace;
    this.alias = alias;
    if (Array.isArray(config.keys))
      this.keys = config.keys.map((key) => new ODataEntityTypeKey(key));
    this.fields = Object.entries<StructuredTypeFieldConfig>(
      config.fields as { [P in keyof T]: StructuredTypeFieldConfig }
    ).map(
      ([name, config]) => new ODataStructuredTypeFieldParser(name, this, config)
    );
  }

  /**
   * Create a nicer looking title.
   * Titleize is meant for creating pretty output.
   * @param term The term of the annotation to find.
   * @returns The titleized string.
   */
  titleize(term?: string | RegExp): string {
    return (term && this.annotatedValue(term)) || Strings.titleCase(this.name);
  }

  isTypeOf(type: string) {
    var names = [`${this.namespace}.${this.name}`];
    if (this.alias) names.push(`${this.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  typeFor(name: string): string | undefined {
    const field = this.fields.find((f) => f.name === name);
    if (field === undefined && this.parent !== undefined)
      return this.parent.typeFor(name);
    return field !== undefined ? field.type : undefined;
  }

  findChildParser(
    predicate: (p: ODataStructuredTypeParser<any>) => boolean
  ): ODataStructuredTypeParser<any> | undefined {
    if (predicate(this)) return this;
    let match: ODataStructuredTypeParser<any> | undefined;
    for (let ch of this.children) {
      match = ch.findChildParser(predicate);
      if (match !== undefined) break;
    }
    return match;
  }

  childParser(
    predicate: (p: ODataStructuredTypeParser<any>) => boolean
  ): Parser<any> {
    return this.findChildParser(predicate) || NONE_PARSER;
  }

  // Deserialize
  deserialize(value: any, options?: Options): T {
    const parserOptions =
      options !== undefined
        ? new ODataParserOptions(options)
        : this.optionsHelper;
    if (this.parent !== undefined)
      value = this.parent.deserialize(value, parserOptions);
    const fields = this.fields.filter(
      (f) =>
        f.name in value && value[f.name] !== undefined && value[f.name] !== null
    );
    return {
      ...value,
      ...fields.reduce(
        (acc, f) => ({
          ...acc,
          [f.name]: f.deserialize(value[f.name], parserOptions),
        }),
        {}
      ),
    };
  }

  // Serialize
  serialize(value: T, options?: Options): any {
    const parserOptions =
      options !== undefined
        ? new ODataParserOptions(options)
        : this.optionsHelper;
    if (this.parent !== undefined)
      value = this.parent.serialize(value, parserOptions);
    const fields = this.fields.filter(
      (f) =>
        f.name in value &&
        (value as any)[f.name] !== undefined &&
        (value as any)[f.name] !== null
    );
    return {
      ...value,
      ...fields.reduce(
        (acc, f) => ({
          ...acc,
          [f.name]: f.serialize((value as any)[f.name], parserOptions),
        }),
        {}
      ),
    };
  }

  // Encode
  encode(value: T, options?: Options): any {
    const parserOptions =
      options !== undefined
        ? new ODataParserOptions(options)
        : this.optionsHelper;
    return raw(JSON.stringify(this.serialize(value, parserOptions)));
  }

  configure({
    parserForType,
    options,
  }: {
    parserForType: (type: string) => Parser<any>;
    options: OptionsHelper;
  }) {
    this.optionsHelper = options;
    if (this.base) {
      const parent = parserForType(this.base) as ODataStructuredTypeParser<any>;
      parent.children.push(this);
      this.parent = parent;
    }
    this.fields.forEach((f) => f.configure({ parserForType, options }));
  }

  resolveKey(value: any): any {
    let key = this.parent?.resolveKey(value) || {};
    if (Array.isArray(this.keys) && this.keys.length > 0) {
      for (var k of this.keys) {
        let v = value as any;
        let structured = this as ODataStructuredTypeParser<any> | undefined;
        let field: ODataStructuredTypeFieldParser<any> | undefined;
        for (let name of k.name.split('/')) {
          if (structured === undefined) break;
          field = structured.fields.find((f) => f.name === name);
          if (field !== undefined) {
            v = Types.isPlainObject(v) ? v[field.name] : v;
            structured = field.isStructuredType()
              ? field.structured()
              : undefined;
          }
        }
        if (field !== undefined && v !== undefined) {
          key[k.alias || field.name] = field.encode(v);
        }
      }
    }
    if (Types.isEmpty(key)) return undefined;
    return Objects.resolveKey(key);
  }

  defaults(): { [name: string]: any } {
    let value = this.parent?.defaults() || {};
    let fields = this.fields.filter(
      (f) => f.default !== undefined || f.isStructuredType()
    );
    return {
      ...value,
      ...fields.reduce((acc, f) => {
        let value = f.isStructuredType()
          ? f.structured().defaults()
          : f.default;
        return Types.isEmpty(value) ? acc : { ...acc, [f.name]: value };
      }, {}),
    };
  }

  // Json Schema
  toJsonSchema(options: JsonSchemaOptions<T> = {}) {
    let schema: any = this.parent?.toJsonSchema(options) || {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: `${this.namespace}.${this.name}`,
      title: this.titleize(DESCRIPTION),
      description: this.annotatedValue(LONG_DESCRIPTION),
      type: 'object',
      properties: {},
      required: [],
    };
    const fields = this.fields.filter(
      (f) =>
        (!f.navigation || (options.expand && f.name in options.expand)) &&
        (!options.select || (<string[]>options.select).indexOf(f.name) !== -1)
    );
    schema.properties = Object.assign(
      {},
      schema.properties,
      fields
        .map((f) => {
          let expand =
            options.expand && f.name in options.expand
              ? (options.expand as any)[f.name]
              : undefined;
          let schema = f.toJsonSchema(expand);
          if (options.custom && f.name in options.custom)
            schema = (
              options.custom[f.name as keyof T] as (
                schema: any,
                field: ODataStructuredTypeFieldParser<any>
              ) => any
            )(schema, f);
          return { [f.name]: schema };
        })
        .reduce((acc, v) => Object.assign(acc, v), {})
    );
    schema.required = [
      ...schema.required,
      ...fields
        .filter((f) =>
          options.required && f.name in options.required
            ? options.required[f.name as keyof T]
            : !f.nullable
        )
        .map((f) => f.name),
    ];
    return schema;
  }

  validate(
    attrs: any,
    {
      method,
      navigation = false,
    }: {
      create?: boolean;
      method?: 'create' | 'update' | 'modify';
      navigation?: boolean;
    } = {}
  ): { [name: string]: any } | undefined {
    const errors = (this.parent?.validate(attrs, { method, navigation }) ||
      {}) as { [name: string]: any };
    const fields = this.fields.filter((f) => !f.navigation || navigation);
    for (var field of fields) {
      const value = attrs[field.name as keyof T];
      const errs = field.validate(value, { method, navigation });
      if (errs !== undefined) {
        errors[field.name] = errs;
      }
    }
    return !Types.isEmpty(errors) ? errors : undefined;
  }
}
