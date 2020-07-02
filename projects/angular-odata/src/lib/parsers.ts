import { Types, Enums } from './utils';
import { Parser, Field, JsonSchemaExpandOptions, JsonSchemaConfig, EntityConfig, EnumConfig } from './types';

export const DATE_PARSER: {[type: string]: Parser<any>} = {
  'Date': <Parser<Date>>{
    deserialize(value: any): Date {
      return new Date(value);
    },
    serialize(value: Date): any { 
      return value.toISOString();
    }
  }
};

export const DECIMAL_PARSER: {[type: string]: Parser<any>} = {
  'Decimal': <Parser<number>>{
    deserialize(value: any): number {
      if (this.ieee754Compatible) {
        return Number(value);
      }
      return value;
    },
    serialize(value: number): any { 
      if (this.ieee754Compatible) {
        return parseFloat(value.toPrecision(this.precision)).toFixed(this.scale);
      }
      return value;
    }
  }
};

export interface ODataParser<Type> extends Parser<Type> { 
  configure(settings: {stringAsEnum: boolean, ieee754Compatible: boolean, parserForType: (type: string) => Parser<any>});
  toJsonSchema(options?: JsonSchemaExpandOptions<Type>);
}

export class ODataEnumParser<Type> implements ODataParser<Type> {
  name: string;
  type: string;
  flags?: boolean;
  stringAsEnum?: boolean;
  members: {[name: string]: number} | {[value: number]: string};

  constructor(meta: EnumConfig<Type>, namespace: string) {
    this.name = meta.name;
    this.type = `${namespace}.${this.name}`;
    this.flags = meta.flags;
    this.members = meta.members;
  }

  // Deserialize
  deserialize(value: any) {
    // String to number
    if (value === null || typeof(value) === 'number') return value;
    return this.flags ?
      Enums.toFlags(this.members, value) :
      Enums.toValue(this.members, value);
  }

  // Serialize
  serialize(value: any) {
    // Number to string
    if (value === null || typeof(value) === 'string') return value;
    let enums = this.flags ?
      Enums.toEnums(this.members, value) :
      [Enums.toEnum(this.members, value)];
    if (!this.stringAsEnum)
      enums = enums.map(e => `${this.type}'${e}'`);
    return enums.join(", ");
  }

  // Json Schema
  toJsonSchema(options: JsonSchemaExpandOptions<Type> = {}) {
    let property = <any>{
      title: `The ${this.name} field`,
      type: "string"
    };
    property.enum = Enums.keys(this.members);
    return property;
  }

  configure(settings: {stringAsEnum: boolean, ieee754Compatible: boolean, parserForType: (type: string) => Parser<any>}) {
    this.stringAsEnum = settings.stringAsEnum;
  }
}

export class ODataFieldParser<T> implements ODataParser<T> {
  name: string;
  type: string;
  parser?: Parser<any>;
  default?: any;
  maxLength?: number;
  key?: boolean;
  collection?: boolean;
  nullable?: boolean;
  navigation?: boolean;
  field?: string;
  precision?: number;
  scale?: number;
  ref?: string;
  ieee754Compatible?: boolean;

  constructor(name: string, field: Field) {
    this.name = name;
    Object.assign(this, field);
  }

  resolve(value: any) {
    return this.ref.split('/').reduce((acc, name) => acc[name], value);
  }

  // Deserialize
  deserialize(value: any) {
    if (this.parser) 
      return Array.isArray(value) ? 
        value.map(v => this.parser.deserialize(v)) : 
        this.parser.deserialize(value);
    return value;
  }

  // Serialize
  serialize(value: any) {
    if (this.parser)
      return Array.isArray(value) ? 
        value.map(v => this.parser.serialize(v)) : 
        this.parser.serialize(value);
    return value;
  }

  configure(settings: {stringAsEnum: boolean, ieee754Compatible: boolean, parserForType: (type: string) => Parser<any>}) {
    this.ieee754Compatible = settings.ieee754Compatible;
    const parser = settings.parserForType(this.type);
    if (parser) {
      if (parser instanceof ODataEntityParser || parser instanceof ODataEnumParser)
        this.parser = parser;
      else {
        // Change deserialize/serialize
        this.deserialize = (value: any) => Array.isArray(value) ? 
          value.map(v => parser.deserialize.call(this, v)) : 
          parser.deserialize.call(this, value);
        this.serialize = (value: any) => Array.isArray(value) ? 
          value.map(v => parser.serialize.call(this, v)) : 
          parser.serialize.call(this, value);
      }
    }
  }

  // Json Schema
  toJsonSchema(options: JsonSchemaExpandOptions<T> = {}) {
    let property = this.parser ? (this.parser as ODataParser<any>).toJsonSchema(options) : <any>{
      title: `The ${this.name} field`,
      type: this.parser ? "object" : this.type
    };
    if (this.maxLength)
      property.maxLength = this.maxLength;
    if (this.collection)
      property = {
        type: "array", 
        items: property,
        additionalItems: false
      };
    return property;
  }

  isNavigation() {
    return this.navigation;
  }

  isEnumType() {
    return this.parser instanceof ODataEnumParser;
  }

  isEntityType() {
    return this.parser instanceof ODataEntityParser;
  }

  isComplexType() {
    return this.parser instanceof ODataEntityParser && this.parser.isComplex();
  }
}

export class ODataEntityParser<Type> implements ODataParser<Type> {
  name: string;
  type: string;
  base: string;
  parent: ODataEntityParser<any>;
  fields: ODataFieldParser<any>[];

  constructor(config: EntityConfig<Type>, namespace: string) {
    this.name = config.name;
    this.base = config.base;
    this.type = `${namespace}.${this.name}`;
    this.fields = Object.entries(config.fields)
      .map(([name, f]) => new ODataFieldParser(name, f as Field));
  }

  // Deserialize
  deserialize(objs: any): Type | Type[] {
    if (this.parent)
      objs = this.parent.deserialize(objs);
    let _parse = (obj) =>
      Object.assign(obj, this.fields
        .filter(f => f.name in obj)
        .reduce((acc, f) => Object.assign(acc, { [f.name]: obj[f.name] && f.deserialize(obj[f.name]) }), {})
      );
    return Array.isArray(objs) ?
      objs.map(obj => _parse(obj)) :
      _parse(objs);
  }

  // Serialize
  serialize(objs: any): any {
    if (this.parent)
      objs = this.parent.serialize(objs);
    let _toJSON = (obj) => Object.assign(obj, this.fields
      .filter(f => f.name in obj)
      .reduce((acc, f) => Object.assign(acc, { [f.name]: obj[f.name] && f.serialize(obj[f.name]) }), {})
    );
    return Array.isArray(objs) ? 
      objs.map(obj => _toJSON(obj)) :
      _toJSON(objs);
  }

  configure(settings: {stringAsEnum: boolean, ieee754Compatible: boolean, parserForType: (type: string) => Parser<any>}) {
    if (this.base) {
      this.parent = settings.parserForType(this.base) as ODataEntityParser<any>;
    }
    this.fields.forEach(f => f.configure(settings));
  }

  // Json Schema
  toJsonSchema(config: JsonSchemaConfig<Type> = {}) {
    let properties = this.fields
      .filter(f => (!f.navigation || (config.expand && f.name in config.expand)) && (!config.select || (<string[]>config.select).indexOf(f.name) !== -1))
      .map(f => ({[f.name]: f.toJsonSchema(config[f.name])}))
      .reduce((acc, v) => Object.assign(acc, v), {});
    return {
      title: `The ${this.name} schema`,
      type: "object",
      description: `The ${this.name} configuration`,
      properties: properties,
      required: this.fields.filter(f => !f.nullable).map(f => f.name)
    };
  }

  typeFor(name: string): string {
    let field = this.fields.find(f => f.name === name);
    if (field)
      return field.type;
    else if (this.parent) 
      return this.parent.typeFor(name);
  }

  keys() { 
    let keys = (this.parent) ? this.parent.keys() : [];
    return [...keys, ...this.fields.filter(f => f.key)];
  }

  resolveKey(attrs: any) {
    let key = this.keys()
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.resolve(attrs) }), {});
    if (Object.keys(key).length === 1)
      key = Object.values(key)[0];
    if (!Types.isEmpty(key))
      return key;
  }

  isComplex() {
    return this.keys().length === 0;
  }
}