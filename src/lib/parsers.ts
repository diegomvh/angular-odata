import { Types, Enums } from './utils';
import { Parser, Field, JsonSchemaExpandOptions, JsonSchemaConfig, EntityConfig, EnumConfig } from './types';

export const PARSERS: {[name: string]: Parser<any>} = {
  'Date': <Parser<Date>>{
    type: 'Date',
    parse(value: any) {
      return Array.isArray(value) ?
        value.map(v => new Date(v)) :
        new Date(value);
    },
    toJSON(value: Date) { 
      return Array.isArray(value) ?
        value.map(v => new Date(v)) :
        new Date(value);
    }
  },
  'number': <Parser<number>>{
    type: 'number',
    parse(value: any) {
      return Array.isArray(value) ?
        value.map(v => Number(v)) :
        Number(value);
    },
    toJSON(value: number) { 
      return Array.isArray(value) ?
        value.map(v => Number(v)) :
        Number(value);
    }
  }
};

export interface ODataParser<Type> extends Parser<Type> { 
  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>});
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
  parse(value: any) {
    // String to number
    if (value === null || typeof(value) === 'number') return value;
    return this.flags ?
      Enums.toFlags(this.members, value) :
      Enums.toValue(this.members, value);
  }

  // Serialize
  toJSON(value: any) {
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

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.stringAsEnum = settings.stringAsEnum;
  }
}

export class ODataFieldParser<T> implements ODataParser<T> {
  name: string;
  type: string;
  entity: ODataEntityParser<any>;
  parser?: Parser<any>;
  default?: any;
  maxLength?: number;
  key?: boolean;
  collection?: boolean;
  nullable?: boolean;
  navigation?: boolean;
  field?: string;
  ref?: string;

  constructor(name: string, field: Field, entity: ODataEntityParser<any>) {
    this.name = name;
    this.entity = entity;
    Object.assign(this, field);
  }

  resolve(value: any) {
    return this.ref.split('/').reduce((acc, name) => acc[name], value);
  }

  // Deserialize
  parse(value: any) {
    if (value === null) return value;
    return this.parser ? this.parser.parse(value) : value;
  }

  // Serialize
  toJSON(value: any) {
    if (value === null) return value;
    return this.parser ? this.parser.toJSON(value) : value;
  }

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
    this.parser = (this.type in PARSERS) ? 
      PARSERS[this.type] : 
      settings.parserForType(this.type);
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
      .map(([name, f]) => new ODataFieldParser(name, f as Field, this));
  }

  // Deserialize
  parse(objs: any): Type | Type[] {
    if (this.parent)
      objs = this.parent.parse(objs);
    let _parse = (obj) =>
      Object.assign(obj, this.fields
        .filter(f => f.name in obj)
        .reduce((acc, f) => Object.assign(acc, { [f.name]: f.parse(obj[f.name]) }), {})
      );
    return Array.isArray(objs) ?
      objs.map(obj => _parse(obj)) :
      _parse(objs);
  }

  // Serialize
  toJSON(objs: any): any {
    if (this.parent)
      objs = this.parent.toJSON(objs);
    let _toJSON = (obj) => Object.assign(obj, this.fields
      .filter(f => f.name in obj)
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.toJSON(obj[f.name]) }), {})
    );
    return Array.isArray(objs) ? 
      objs.map(obj => _toJSON(obj)) :
      _toJSON(objs);
  }

  configure(settings: {stringAsEnum: boolean, parserForType: (type: string) => ODataParser<any>}) {
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