import { Types } from '../utils';
import { Parser, Field, JsonSchemaExpandOptions, JsonSchemaConfig, EntityConfig, DeserializeOptions, SerializeOptions } from '../types';

import { ODataParser, NONE_PARSER } from './base';
import { ODataEnumParser } from './enum';

export class ODataFieldParser<Type> extends ODataParser<Type> {
  private parser?: Parser<Type>;
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

  constructor(name: string, field: Field) {
    super(name, field.type);
    Object.assign(this, field);
  }

  resolve(value: any) {
    return this.ref.split('/').reduce((acc, name) => acc[name], value);
  }

  // Deserialize
  deserialize(value: any, options: DeserializeOptions): Partial<Type> | Partial<Type>[] {
    if (this.parser instanceof ODataEntityParser) {
      return Array.isArray(value) ?
        (value.map(v => this.parser.deserialize(v, options)) as Partial<Type>[]):
        (this.parser.deserialize(value, options) as Partial<Type>);
    } else if (this.parser instanceof ODataEnumParser) {
      return this.parser.deserialize(value, options);
    }
    return this.parser.deserialize(value, options);
  }

  // Serialize
  serialize(value: Partial<Type> | Partial<Type>[], options: SerializeOptions): any {
    if (this.parser instanceof ODataEntityParser) {
      return Array.isArray(value) ?
        value.map(v => this.parser.serialize(v, options)) :
        this.parser.serialize(value, options);
    } else if (this.parser instanceof ODataEnumParser) {
      return this.parser.serialize(value, options);
    }
    return this.parser.serialize(value, options);
  }

  configure(settings: { parserForType: (type: string) => Parser<any> }) {
    this.parser = settings.parserForType(this.type) || NONE_PARSER;
  }

  // Json Schema
  toJsonSchema(options: JsonSchemaExpandOptions<Type> = {}) {
    let property = this.parser instanceof ODataParser ? this.parser.toJsonSchema(options) : <any>{
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
}

export class ODataEntityParser<Type> extends ODataParser<Type> {
  base: string;
  parent: ODataEntityParser<any>;
  fields: ODataFieldParser<any>[];

  constructor(config: EntityConfig<Type>, namespace: string) {
    super(config.name, `${namespace}.${config.name}`);
    this.base = config.base;
    this.fields = Object.entries(config.fields)
      .map(([name, f]) => new ODataFieldParser(name, f as Field));
  }

  // Deserialize
  deserialize(value: any, options: DeserializeOptions): Partial<Type> {
    if (this.parent)
      value = this.parent.deserialize(value, options);
    return Object.assign(value, this.fields
      .filter(f => f.name in value && !Types.isNullOrUndefined(value[f.name]))
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.deserialize(value[f.name], options) }), {})
    );
  }

  // Serialize
  serialize(entity: Partial<Type>, options: SerializeOptions): any {
    if (this.parent)
      entity = this.parent.serialize(entity, options);
    return Object.assign(entity, this.fields
      .filter(f => f.name in entity && !Types.isNullOrUndefined(entity[f.name]))
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.serialize(entity[f.name], options) }), {})
    );
  }

  configure(settings: { parserForType: (type: string) => Parser<any> }) {
    if (this.base) {
      this.parent = settings.parserForType(this.base) as ODataEntityParser<any>;
    }
    this.fields.forEach(f => f.configure(settings));
  }

  // Json Schema
  toJsonSchema(config: JsonSchemaConfig<Type> = {}) {
    let properties = this.fields
      .filter(f => (!f.navigation || (config.expand && f.name in config.expand)) && (!config.select || (<string[]>config.select).indexOf(f.name) !== -1))
      .map(f => ({ [f.name]: f.toJsonSchema(config[f.name]) }))
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