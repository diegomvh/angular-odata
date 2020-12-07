import { EnumHelper } from '../helpers';
import { JsonSchemaExpandOptions, EnumTypeConfig, Parser, StructuredTypeFieldOptions, EnumTypeField, Annotation } from '../types';

export class ODataEnumFieldParser<Type> implements EnumTypeField {
  name: string;
  value: number;
  annotations: Annotation[];
  constructor(name: string, field: EnumTypeField) {
    this.name = name;
    this.value = field.value;
    this.annotations = field.annotations || [];
  }
  annotation(type: string) {
    return this.annotations.find(annot => annot.type === type);
  }
}

export class ODataEnumParser<Type> implements Parser<Type> {
  name: string;
  type: string;
  flags?: boolean;
  members: { [name: string]: number } | { [value: number]: string };
  fields: ODataEnumFieldParser<any>[];

  constructor(config: EnumTypeConfig<Type>, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${config.name}`;
    this.flags = config.flags;
    this.members = config.members;
    this.fields = Object.entries(config.fields)
      .map(([name, f]) => new ODataEnumFieldParser<Type>(name, f as EnumTypeField));
  }

  // Deserialize
  deserialize(value: string, options: StructuredTypeFieldOptions): Type {
    // string -> Type
    if (this.flags) {
      return EnumHelper.toValues(this.members, value).reduce((acc, v) => acc | v, 0) as any;
    } else {
      return EnumHelper.toValue(this.members, value) as any;
    }
  }

  // Serialize
  serialize(value: Type, options: StructuredTypeFieldOptions): string {
    // Type -> string
    if (this.flags) {
      let names = EnumHelper.toNames(this.members, value);
      if (!options.stringAsEnum)
        names = names.map(name => `${this.type}'${name}'`)
      return names.join(", ");
    } else {
      let name = EnumHelper.toName(this.members, (<any>value) as number);
      if (!options.stringAsEnum)
        name = `${this.type}'${name}'`;
      return name;
    }
  }

  // Json Schema
  toJsonSchema(options: JsonSchemaExpandOptions<Type> = {}) {
    let property = <any>{
      title: `The ${this.name} field`,
      type: "string"
    };
    property.enum = EnumHelper.names(this.members);
    return property;
  }
}
