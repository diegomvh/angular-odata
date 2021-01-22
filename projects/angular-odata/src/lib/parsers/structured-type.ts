import { Types } from '../utils';
import { Parser, StructuredTypeField, StructuredTypeConfig, Annotation, OptionsHelper } from '../types';
import { ODataEnumTypeParser } from './enum-type';

const NONE_PARSER = {
  deserialize: (value: any, options: OptionsHelper) => value,
  serialize: (value: any, options: OptionsHelper) => value,
} as Parser<any>;

// JSON SCHEMA
type JsonSchemaSelect<T> = Array<keyof T>;
type JsonSchemaCustom<T> = {[P in keyof T]?: (schema: any, field: ODataStructuredTypeFieldParser<T[P]>) => any };
type JsonSchemaExpand<T> = {[P in keyof T]?: JsonSchemaOptions<T[P]> };
export type JsonSchemaExpandOptions<T> = {
  select?: JsonSchemaSelect<T>;
  custom?: JsonSchemaCustom<T>;
  expand?: JsonSchemaExpand<T>;
}

export type JsonSchemaOptions<T> = JsonSchemaExpandOptions<T>;

export class ODataStructuredTypeFieldParser<Type> implements StructuredTypeField, Parser<Type> {
  name: string;
  type: string;
  private parser: Parser<Type>;
  default?: any;
  maxLength?: number;
  key: boolean;
  collection: boolean;
  nullable: boolean;
  navigation: boolean;
  field?: string;
  precision?: number;
  scale?: number;
  ref?: string;
  annotations: Annotation[];

  constructor(name: string, field: StructuredTypeField) {
    this.name = name;
    this.type = field.type;
    this.parser = NONE_PARSER;
    this.annotations = field.annotations || [];
    this.default = field.default;
    this.maxLength = field.maxLength;
    this.key = field.key !== undefined ? field.key : false;
    this.collection = field.collection !== undefined ? field.collection : false;
    this.nullable = field.nullable !== undefined ? field.nullable : true;
    this.navigation = field.navigation !== undefined ? field.navigation : false;
    this.field = field.field;
    this.precision = field.precision;
    this.scale = field.scale;
    this.ref = field.ref;
  }
  findAnnotation(predicate: (annot: Annotation) => boolean) {
    return this.annotations.find(predicate);
  }

  resolve(value: any) {
    return (this.ref || this.name).split('/').reduce((acc, name) => acc[name], value);
  }

  // Deserialize
  private parse(parser: ODataStructuredTypeParser<Type>, value: any, options: OptionsHelper): any {
    const type = Types.isObject(value) ? options.helper.type(value) : undefined;
    if (type !== undefined) {
      return parser.findParser(c => c.isTypeOf(type)).deserialize(value, options);
    }
    return parser.deserialize(value, options);
  }

  deserialize(value: any, options: OptionsHelper): Type {
    const parser = this.parser;
    if (parser instanceof ODataStructuredTypeParser) {
      return Array.isArray(value) ?
        value.map(v => this.parse(parser, v, options)) :
        this.parse(parser, value, options);
    }
    return parser.deserialize(value, Object.assign({field: this}, options));
  }

  // Serialize
  private toJson(parser: ODataStructuredTypeParser<Type>, value: any, options: OptionsHelper): any {
    const type = Types.isObject(value) ? options.helper.type(value) : undefined;
    if (type !== undefined) {
      return parser.findParser(c => c.isTypeOf(type)).serialize(value, options);
    }
    return parser.serialize(value, options);
  }

  serialize(value: Type, options: OptionsHelper): any {
    const parser = this.parser;
    if (parser instanceof ODataStructuredTypeParser) {
      return Array.isArray(value) ?
        (value as any[]).map(v => this.toJson(parser, v, options)) :
        this.toJson(parser, value, options);
    }
    return parser.serialize(value, Object.assign({field: this}, options));
  }

  configure(settings: {
    findParserForType: (type: string) => Parser<any> | undefined,
    options: OptionsHelper
  }) {
    this.parser = settings.findParserForType(this.type) || NONE_PARSER;
    if (this.default !== undefined)
      this.default = this.deserialize(this.default, settings.options);
  }

  // Json Schema
  // https://json-schema.org/
  toJsonSchema(options: JsonSchemaExpandOptions<Type> = {}) {
    let schema: any = (this.parser instanceof ODataStructuredTypeFieldParser ||
      this.parser instanceof ODataStructuredTypeParser ||
      this.parser instanceof ODataEnumTypeParser) ?
    this.parser.toJsonSchema(options) : {title: this.name, type: "object"} as any;

    if (["Edm.String", "Edm.Date", "Edm.TimeOfDay", "Edm.DateTimeOffset", "Edm.Guid", "Edm.Binary"].indexOf(this.type) !== -1) {
      schema.type = "string";
      if (this.type === "Edm.Date")
        schema.format = "date";
      else if (this.type === "Edm.TimeOfDay")
        schema.format = "time";
      else if (this.type === "Edm.DateTimeOffset")
        schema.format = "date-time";
      else if (this.type === "Edm.Guid")
        schema.pattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
      else if (this.type === "Edm.Binary")
        schema.contentEncoding = "base64";
      else if (this.type === "Edm.String" && this.maxLength)
        schema.maxLength = this.maxLength;
    } else if (["Edm.Int64", "Edm.Int32", "Edm.Int16", "Edm.Byte", "Edm.SByte"].indexOf(this.type) !== -1) {
      //TODO: Range
      schema.type = "integer";
    } else if (["Edm.Decimal", "Edm.Double"].indexOf(this.type) !== -1) {
      schema.type = "number";
    } else if (["Edm.Boolean"].indexOf(this.type) !== -1) {
      schema.type = "boolean";
    }
    if (this.default)
      schema.default = this.default;
    if (this.nullable)
      schema.type = [schema.type, 'null'];
    if (this.collection)
      schema = {
        type: "array",
        items: schema,
        additionalItems: false
      };
    return schema;
  }

  isNavigation() {
    return this.navigation;
  }
  isEnumType() {
    return this.parser instanceof ODataEnumTypeParser;
  }
  isStructuredType() {
    return this.parser instanceof ODataStructuredTypeParser;
  }
  isComplexType() {
    return this.parser instanceof ODataStructuredTypeParser && this.parser.isComplexType();
  }

  isEdmType() {
    return this.type.startsWith("Edm.");
  }
  enum() {
    if (!this.isEnumType())
      throw new Error("Field are not EnumType")
    return this.parser as ODataEnumTypeParser<Type>;
  }
  structured() {
    if (!this.isStructuredType())
      throw new Error("Field are not StrucuturedType")
    return this.parser as ODataStructuredTypeParser<Type>;
  }
}

export class ODataStructuredTypeParser<Type> implements Parser<Type> {
  name: string;
  namespace: string;
  alias?: string;
  base?: string;
  parent?: ODataStructuredTypeParser<any>;
  children: ODataStructuredTypeParser<any>[];
  fields: ODataStructuredTypeFieldParser<any>[];

  constructor(config: StructuredTypeConfig<Type>, namespace: string, alias?: string) {
    this.name = config.name;
    this.base = config.base;
    this.namespace = namespace;
    this.alias = alias;
    this.children = [];
    this.fields = Object.entries(config.fields)
      .map(([name, f]) => new ODataStructuredTypeFieldParser(name, f as StructuredTypeField));
  }

  isTypeOf(type: string) {
    var names = [`${this.namespace}.${this.name}`];
    if (this.alias)
      names.push(`${this.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  // Deserialize
  deserialize(value: any, options: OptionsHelper): Type {
    if (this.parent)
      value = this.parent.deserialize(value, options);
    return Object.assign({}, value, this.fields
      .filter(f => f.name in value && value[f.name] !== undefined && value[f.name] !== null)
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.deserialize(value[f.name], options) }), {})
    );
  }

  // Serialize
  serialize(value: Type, options: OptionsHelper): any {
    if (this.parent)
      value = this.parent.serialize(value, options);
    return Object.assign({}, value, this.fields
      .filter(f => f.name in value && (value as any)[f.name] !== undefined && (value as any)[f.name] !== null)
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.serialize((value as any)[f.name], options) }), {})
    );
  }

  configure(settings: {
    findParserForType: (type: string) => Parser<any> | undefined,
    options: OptionsHelper
  }) {
    if (this.base) {
      const parent = settings.findParserForType(this.base) as ODataStructuredTypeParser<any>;
      parent.children.push(this);
      this.parent = parent;
    }
    this.fields.forEach(f => f.configure(settings));
  }

  // Json Schema
  toJsonSchema(options: JsonSchemaOptions<Type> = {}) {
    let schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: `${this.namespace}.${this.name}`,
      title: this.name,
      type: "object"
    } as any;
    const fields = this.fields
      .filter(f => (!f.navigation || (options.expand && f.name in options.expand)) && (!options.select || (<string[]>options.select).indexOf(f.name) !== -1));
    schema.properties = fields
      .map(f => {
        let expand = options.expand && f.name in options.expand ? (options.expand as any)[f.name] : undefined;
        let schema = f.toJsonSchema(expand);
        if (options.custom && f.name in options.custom)
          schema = (options.custom[f.name as keyof Type] as (schema: any, field: ODataStructuredTypeFieldParser<any>) => any)(schema, f);
        return { [f.name]: schema };
      })
      .reduce((acc, v) => Object.assign(acc, v), {});
    schema.required = fields.filter(f => !f.nullable).map(f => f.name);
    return schema;
  }

  typeFor(name: string): string | undefined {
    const field = this.fields.find(f => f.name === name);
    if (field === undefined && this.parent !== undefined)
      return this.parent.typeFor(name);
    return field !== undefined ? field.type : undefined;
  }

  keys() {
    const keys: ODataStructuredTypeFieldParser<any>[] = (this.parent) ? this.parent.keys() : [];
    return [...keys, ...this.fields.filter(f => f.key)];
  }

  resolveKey(attrs: any) {
    let key = this.keys()
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.resolve(attrs) }), {}) as any;
    const values = Object.values(key);
    if (values.length === 1) {
      // Single primitive key value
      key = values[0];
    } else if (values.some(v => v === undefined)) {
      // Compose key, needs all values
      key = null;
    }
    if (!Types.isEmpty(key))
      return key;
  }

  isComplexType() {
    return this.keys().length === 0;
  }

  find(predicate: (p: ODataStructuredTypeParser<any>) => boolean): ODataStructuredTypeParser<any> | undefined {
    if (predicate(this))
      return this;
    return this.children.find(c => c.find(predicate));
  }

  findParser(predicate: (p: ODataStructuredTypeParser<any>) => boolean): Parser<any> {
    return this.find(predicate) || NONE_PARSER;
  }

  defaults(): {[name: string]: any} {
    let value = (this.parent) ? this.parent.defaults() : {};
    let fields = this.fields.filter(f => f.default !== undefined || f.isComplexType());
    return Object.assign({}, value, fields.reduce((acc, f) => {
      let value = f.isComplexType() ? f.structured().defaults() : f.default;
      if (!Types.isEmpty(value))
        Object.assign(acc, {[f.name]: value });
      return acc;
    }, {}));
  }
}
