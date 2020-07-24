import { Enums } from '../utils';
import { JsonSchemaExpandOptions, EnumConfig, ParseOptions, Parser } from '../types';

export class ODataEnumParser<Type> implements Parser<Type> {
  name: string;
  type: string;
  flags?: boolean;
  members: { [name: string]: number } | { [value: number]: string };

  constructor(meta: EnumConfig<Type>, namespace: string) {
    this.name = meta.name;
    this.type = `${namespace}.${meta.name}`;
    this.flags = meta.flags;
    this.members = meta.members;
  }

  // Deserialize
  deserialize(value: any, options: ParseOptions): Partial<Type> | Partial<Type>[] {
    // string | string[] -> number | number[]
    if (this.flags) {
      return Enums.toValues(this.members, value) as any;
    } else {
      return Enums.toValue(this.members, value) as any;
    }
  }

  // Serialize
  serialize(value: Partial<Type> | Partial<Type>[], options: ParseOptions): any {
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
