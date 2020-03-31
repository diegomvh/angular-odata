import { Types, Enums } from '../utils';
import { Parser, Field, JsonSchemaExpandOptions, Meta, JsonSchemaConfig } from '../types';

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
    },
    parserFor<E>(name: string) { },
    resolveKey(attrs: any) {}
  },
};

export class ODataField<T> implements Field, Parser<T> {
  name: string;
  type: string;
  enum?: { [key: number]: string | number };
  parser?: Parser<any>;
  enumString?: boolean;
  default?: any;
  maxLength?: number;
  key?: boolean;
  collection?: boolean;
  nullable?: boolean;
  flags?: boolean;
  navigation?: boolean;
  field?: string;
  ref?: string;

  constructor(name: string, field: Field) {
    this.name = name;
    Object.assign(this, field);
  }

  resolve(value: any) {
    return this.ref.split('/').reduce((acc, name) => acc[name], value);
  }

  // Deserialize
  parse(value: any) {
    if (value === null) return value;
    if (this.enum) {
      //TODO: enumString
      return this.flags ?
        Enums.toFlags(this.enum, value) :
        Enums.toValue(this.enum, value);
    } else if (this.parser) {
      return this.parser.parse(value);
    } else if (this.type in PARSERS) {
      return PARSERS[this.type].parse(value);
    }
    return value;
  }

  // Serialize
  toJSON(value: any) {
    if (value === null) return value;
    if (this.enum) {
      let enums = this.flags ?
        Enums.toEnums(this.enum, value) :
        [Enums.toEnum(this.enum, value)];
      if (!this.enumString)
        enums = enums.map(e => `${this.type}'${e}'`);
      return enums.join(", ");
    } else if (this.parser) {
      return this.parser.toJSON(value);
    } else if (this.type in PARSERS) {
      return PARSERS[this.type].toJSON(value);
    }
    return value;
  }

  // Json Schema
  toJsonSchema(options: JsonSchemaExpandOptions<T> = {}) {
    let property = this.parser ? this.parser.toJsonSchema(options) : <any>{
      title: `The ${this.name} field`,
      type: this.enum ? "string" : this.parser ? "object" : this.type
    };
    if (this.maxLength)
      property.maxLength = this.maxLength;
    if (this.enum)
      property.enum = Enums.keys(this.enum);
    if (this.collection)
      property = {
        type: "array", 
        items: property,
        additionalItems: false
      };
    return property;
  }

  parserFor<E>(name: string): Parser<E> {
    return this.parser.parserFor(name);
  }

  resolveKey(attrs: any) {
    return this.parser.resolveKey(attrs);
  }
}

export class ODataParser<Type> implements Parser<Type> {
  type: string;
  base: string;
  parent: ODataParser<any>;
  fields: ODataField<any>[];

  constructor(meta: Meta) {
    this.type = meta.type;
    this.base = meta.base;
    this.fields = Object.entries(meta.fields)
      .map(([name, f]) => new ODataField(name, f));
  }

  configure(type: string, settings: ODataSettings) {
    this.type = type;
    if (this.base in settings.parsers) {
      this.parent = settings.parsers[this.base];
    }
    this.fields.forEach(f => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
        f.enumString = settings.stringAsEnum;
      }
      if (f.type in settings.parsers) {
        f.parser = settings.parsers[f.type];
      }
    });
  }

  // Deserialize
  parse(objs: any): any {
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

  // Json Schema
  toJsonSchema(config: JsonSchemaConfig<Type> = {}) {
    let properties = this.fields
      .filter(f => (!f.navigation || (config.expand && f.name in config.expand)) && (!config.select || (<string[]>config.select).indexOf(f.name) !== -1))
      .map(f => ({[f.name]: f.toJsonSchema(config[f.name])}))
      .reduce((acc, v) => Object.assign(acc, v), {});
    return {
      title: `The ${this.type} schema`,
      type: "object",
      description: `The ${this.type} configuration`,
      properties: properties,
      required: this.fields.filter(f => !f.nullable).map(f => f.name)
    };
  }

  parserFor<E>(name: string): Parser<E> {
    let parser: Parser<E>;
    if (this.parent)
      parser = this.parent.parserFor(name);
    if (!parser)
      parser = this.fields.find(f => f.name === name) as Parser<E>;
    return parser; 
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
}