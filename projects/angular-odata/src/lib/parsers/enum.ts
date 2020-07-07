import { Enums } from '../utils';
import { Parser, JsonSchemaExpandOptions, EnumConfig } from '../types';

import { ODataParser } from './base';

export class ODataEnumParser<Type> extends ODataParser<Type> {
  flags?: boolean;
  members: { [name: string]: number } | { [value: number]: string };

  constructor(meta: EnumConfig<Type>, namespace: string) {
    super(meta.name, `${namespace}.${meta.name}`);
    this.flags = meta.flags;
    this.members = meta.members;
  }

  // Deserialize
  deserialize(value: any): Partial<Type> {
    // String to number
    if (typeof (value) === 'number') return <any>value as Type;
    return this.flags ?
      <any>Enums.toFlags(this.members, value):
      <any>Enums.toValue(this.members, value);
  }

  // Serialize
  serialize(value: Partial<Type>): any {
    // Number to string
    if (typeof (value) === 'string') return value;
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
}
