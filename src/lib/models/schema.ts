import { Parser, PARSERS } from './parser';
import { ODataSettings } from './settings';
import { Types, Enums } from '../utils';

type Select<T> = Array<keyof T>;
type Order<T> = Array<keyof T>;
type Expand<T> = {[P in keyof T]?: JsonSchemaConfig<T[P]> };

type ExpandOptions<T> = {
  select?: Select<T>;
  order?: Order<T>;
  expand?: Expand<T>;
}

type JsonSchemaConfig<T> = ExpandOptions<T>; 

export interface Field {
  type: string;
  enum?: { [key: number]: string | number };
  schema?: ODataSchema<any>;
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

export class ODataSchemaField<T> implements Field, Parser<T> {
  name: string;
  type: string;
  enum?: { [key: number]: string | number };
  schema?: ODataSchema<any>;
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
    } else if (this.schema) {
      return this.schema.parse(value);
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
    } else if (this.schema) {
      return this.schema.toJSON(value);
    } else if (this.type in PARSERS) {
      return PARSERS[this.type].toJSON(value);
    }
    return value;
  }

  // Json Schema
  toJsonSchema(options: ExpandOptions<T> = {}) {
    let property = this.schema ? this.schema.toJsonSchema(options) : <any>{
      title: `The ${this.name} field`,
      type: this.enum ? "string" : this.schema ? "object" : this.type
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
    return this.schema.parserFor(name);
  }

  resolveKey(attrs: any) {
    return this.schema.resolveKey(attrs);
  }
}

export class ODataSchema<Type> implements Parser<Type> {
  type: string;
  fields: ODataSchemaField<any>[];
  get keys() { return this.fields.filter(f => f.key); }
  model?: { new(...any): any };

  constructor(fields: { [name: string]: Field }) {
    this.fields = Object.entries(fields)
      .map(([name, f]) => new ODataSchemaField(name, f));
  }

  configure(type: string, settings: ODataSettings) {
    this.type = type;
    if (this.type in settings.models) {
      this.model = settings.models[this.type];
    }
    this.fields.forEach(f => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
        f.enumString = settings.stringAsEnum;
      }
      if (f.type in settings.schemas) {
        f.schema = settings.schemas[f.type] as ODataSchema<any>;
      }
    });
  }

  // Deserialize
  parse(objs: any): any {
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

  isComplex() {
    return this.fields.every(f => !f.key);
  }
}