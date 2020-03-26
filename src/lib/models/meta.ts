import { Parser, PARSERS, JsonSchemaConfig, JsonSchemaExpandOptions } from './parser';
import { ODataSettings } from './settings';
import { Types, Enums } from '../utils';

export type Field = {
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
}

export type Meta = {
  type: string;
  baseType?: string;
  path?: string;
  fields: { [name: string]: Field }
}

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
  base: Parser<any>;
  fields: ODataField<any>[];
  get keys() { return this.fields.filter(f => f.key); }

  constructor(fields: ODataField<any>[]) {
    this.fields = fields;
  }

  configure(type: string, base: Parser<any>, parsers: {[name: string]: Parser<any>}) {
    this.type = type;
    this.base = base;
    this.fields.forEach(f => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
        f.enumString = settings.stringAsEnum;
      }
      if (f.type in parsers) {
        f.parser = parsers[f.type];
      }
    });
  }

  // Deserialize
  parse(objs: any): any {
    if (this.base)
      objs = this.base.parse(objs);
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
    if (this.base)
      objs = this.base.toJSON(objs);
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
    return this.fields.find(f => f.name === name) as Parser<E>;
  }

  resolveKey(attrs: any) {
    let key = this.keys
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.resolve(attrs) }), {});
    if (Object.keys(key).length === 1)
      key = Object.values(key)[0];
    if (!Types.isEmpty(key))
      return key;
  }
}

export class ODataMeta<Type> {
  type: string;
  baseType: string;
  path: string;
  parser?: ODataParser<Type>;
  base?: ODataMeta<any>;
  model?: { new(...any): any };
  collection?: { new(...any): any };

  constructor(meta: Meta) {
    this.type = meta.type;
    this.baseType = meta.baseType;
    this.path = meta.path;
    let fields = Object.entries(meta.fields)
      .map(([name, f]) => new ODataField(name, f));
    this.parser = new ODataParser<Type>(fields);
  }

  configure(type: string, settings: ODataSettings) {
    if (this.type !== type)
      throw new Error(`Can't configure ${this.type} with ${type}`);
    this.type = type;
    if (this.type in settings.models) {
      this.model = settings.models[this.type];
    }
    if (this.type in settings.collections) {
      this.collection = settings.collections[this.type];
    }
    if (this.baseType in settings.metas) {
      this.base = settings.metas[this.baseType] as ODataMeta<any>;
    }
    let parsers = Object.entries(settings.metas)
      .map(([k, o]) => ({[k]: o.parser}))
      .reduce((acc, p) => Object.assign(acc, p), {});
    this.parser.configure(this.type, this.base && this.base.parser, parsers);
  }
}