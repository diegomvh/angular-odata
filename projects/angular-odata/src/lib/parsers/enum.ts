import { Enums } from '../utils';
import { JsonSchemaExpandOptions, EnumConfig, DeserializeOptions, SerializeOptions } from '../types';

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
  deserialize(value: any, options: DeserializeOptions): Partial<Type> | Partial<Type>[] {
    // string | string[] -> number | number[]
    if (this.flags) {
      return Enums.toValues(this.members, value) as any;
    } else {
      return Enums.toValue(this.members, value) as any;
    }
  }

  // Serialize
  serialize(value: Partial<Type> | Partial<Type>[], options: SerializeOptions): any {
    // number | number[] -> string | string[]
    if (this.flags) {
      const names = Enums.toNames(this.members, value);
      return options.stringAsEnum ? names : names.map(name => `${this.type}'${name}'`);
    } else {
      const name = Enums.toName(this.members, value);
      return options.stringAsEnum ? name : `${this.type}'${name}'`;
    }
  }

  // Json Schema
  toJsonSchema(options: JsonSchemaExpandOptions<Type> = {}) {
    let property = <any>{
      title: `The ${this.name} field`,
      type: "string"
    };
    property.enum = Enums.names(this.members);
    return property;
  }
}
