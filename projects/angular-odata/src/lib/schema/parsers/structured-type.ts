import {
  COMPUTED,
  DEFAULT_VERSION,
  DESCRIPTION,
  LONG_DESCRIPTION,
} from '../../constants';
import { ODataHelper } from '../../helper';
import { raw } from '../../resources/query';
import {
  NONE_PARSER,
  ParserOptions,
  Parser,
  StructuredTypeConfig,
  StructuredTypeFieldConfig,
  StructuredTypeFieldOptions,
} from '../../types';
import { Objects, Strings, Types } from '../../utils';
import { ODataAnnotatable } from '../annotation';
import { ODataEnumTypeParser } from './enum-type';

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
  parserOptions?: ParserOptions;

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
    options?: ParserOptions
  ): any {
    const type =
      options !== undefined && Types.isPlainObject(value)
        ? ODataHelper[options?.version || DEFAULT_VERSION].type(value)
        : undefined;
    if (type !== undefined) {
      return parser
        .childParser((c) => c.isTypeOf(type))
        .deserialize(value, options);
    }
    return parser.deserialize(value, options);
  }

  deserialize(value: any, options?: ParserOptions): T {
    const parserOptions = options || this.parserOptions;
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
    options?: ParserOptions
  ): any {
    const type =
      options !== undefined && Types.isPlainObject(value)
        ? ODataHelper[options?.version || DEFAULT_VERSION].type(value)
        : undefined;
    if (type !== undefined) {
      return parser
        .childParser((c) => c.isTypeOf(type))
        .serialize(value, options);
    }
    return parser.serialize(value, options);
  }

  serialize(value: T, options?: ParserOptions): any {
    const parserOptions = options || this.parserOptions;
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
  encode(value: T, options?: ParserOptions): string {
    const parserOptions = options || this.parserOptions;
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
    options: ParserOptions;
  }) {
    this.parserOptions = options;
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
      this.structuredType
        .keys({ include_parents: true })
        ?.find((k) => k.name === this.name) !== undefined
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
  private _keys?: ODataEntityTypeKey[];
  private _fields: ODataStructuredTypeFieldParser<any>[];
  parserOptions?: ParserOptions;

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
      this._keys = config.keys.map((key) => new ODataEntityTypeKey(key));
    this._fields = Object.entries<StructuredTypeFieldConfig>(
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

  isSubtypeOf(type: string): boolean {
    if (this.isTypeOf(type)) return true;
    if (this.parent) return this.parent.isSubtypeOf(type);
    return false;
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
  deserialize(value: any, options?: ParserOptions): T {
    const parserOptions = options || this.parserOptions;
    const fields = this.fields({
      include_navigation: true,
      include_parents: true,
    }).filter(
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
  serialize(value: T, options?: ParserOptions): any {
    const parserOptions = options || this.parserOptions;
    const fields = this.fields({
      include_navigation: true,
      include_parents: true,
    }).filter(
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
  encode(value: T, options?: ParserOptions): any {
    const parserOptions = options || this.parserOptions;
    return raw(JSON.stringify(this.serialize(value, parserOptions)));
  }

  configure({
    parserForType,
    options,
  }: {
    parserForType: (type: string) => Parser<any>;
    options: ParserOptions;
  }) {
    this.parserOptions = options;
    if (this.base) {
      const parent = parserForType(this.base) as ODataStructuredTypeParser<any>;
      parent.children.push(this);
      this.parent = parent;
    }
    this._fields.forEach((f) => f.configure({ parserForType, options }));
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
    return [
      ...(include_parents && this.parent !== undefined
        ? this.parent.fields({ include_parents, include_navigation })
        : []),
      ...this._fields.filter(
        (field) => include_navigation || !field.navigation
      ),
    ];
  }

  /**
   * Returns the keys of the structured type.
   * @param include_parents Include the parent fields
   * @returns The keys of the structured type
   */
  keys({
    include_parents,
  }: {
    include_parents: boolean;
  }): ODataEntityTypeKey[] {
    return [
      ...(include_parents && this.parent !== undefined
        ? this.parent.keys({ include_parents })
        : []),
      ...(this._keys || []),
    ];
  }

  /**
   * Find the field parser for the given field name.
   * @param name Name of the field
   * @returns The field parser
   */
  field<F>(name: keyof T): ODataStructuredTypeFieldParser<F> {
    let field = this.fields({
      include_parents: true,
      include_navigation: true,
    }).find((field: ODataStructuredTypeFieldParser<F>) => field.name === name);
    //Throw error if not found
    if (field === undefined)
      throw new Error(`${this.name} has no field named ${String(name)}`);
    return field;
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
      include_parents = true,
      include_navigation = false,
      include_etag = true,
      options,
    }: {
      include_parents?: boolean;
      include_navigation?: boolean;
      include_etag?: boolean;
      options?: ParserOptions;
    } = {}
  ): Partial<T> {
    const parserOptions = options || this.parserOptions;
    const names = this.fields({ include_parents, include_navigation }).map(
      (f) => f.name
    );
    return Object.keys(attrs)
      .filter(
        (key) =>
          names.indexOf(key) !== -1 ||
          (key ==
            ODataHelper[parserOptions?.version || DEFAULT_VERSION].ODATA_ETAG &&
            include_etag)
      )
      .reduce((acc, key) => Object.assign(acc, { [key]: attrs[key] }), {});
  }

  resolveKey(
    value: any,
    {
      resolve = true,
      single = true,
    }: { resolve?: boolean; single?: boolean } = {}
  ): any {
    const keyTypes = this.keys({ include_parents: true });
    const key = new Map<string, any>();
    for (var kt of keyTypes) {
      let v = value as any;
      let structured = this as ODataStructuredTypeParser<any> | undefined;
      let field: ODataStructuredTypeFieldParser<any> | undefined;
      for (let name of kt.name.split('/')) {
        if (structured === undefined) break;
        field = structured
          .fields({ include_navigation: false, include_parents: true })
          .find((f: ODataStructuredTypeFieldParser<any>) => f.name === name);
        if (field !== undefined) {
          v = Types.isPlainObject(v) ? v[field.name] : v;
          structured = field.isStructuredType()
            ? field.structured()
            : undefined;
        }
      }
      if (field !== undefined && v !== undefined) {
        key.set(kt.alias || field.name, field.encode(v));
      }
    }
    if (key.size === 0) return undefined;
    return resolve
      ? Objects.resolveKey(key, { single })
      : Object.fromEntries(key);
  }

  defaults(): { [name: string]: any } {
    let fields = this.fields({
      include_navigation: false,
      include_parents: true,
    }).filter((f) => f.default !== undefined || f.isStructuredType());
    return {
      ...fields.reduce((acc, f) => {
        let value: any = f.isStructuredType()
          ? f.structured().defaults()
          : f.default;
        return Types.isEmpty(value) ? acc : { ...acc, [f.name]: value };
      }, {}),
    };
  }

  // Json Schema
  toJsonSchema(options: JsonSchemaOptions<T> = {}) {
    let schema: any = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: `${this.namespace}.${this.name}`,
      title: this.titleize(DESCRIPTION),
      description: this.annotatedValue(LONG_DESCRIPTION),
      type: 'object',
      properties: {},
      required: [],
    };
    const fields = this.fields({
      include_navigation: true,
      include_parents: true,
    }).filter(
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
    const errors = {} as { [name: string]: any };
    const fields = this.fields({
      include_navigation: true,
      include_parents: true,
    }).filter((f) => !f.navigation || navigation);
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
