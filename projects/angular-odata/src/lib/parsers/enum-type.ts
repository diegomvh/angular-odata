import { EnumHelper } from '../helpers';
import { EnumTypeConfig, Parser, OptionsHelper, EnumTypeField, Annotation } from '../types';

export class ODataEnumTypeFieldParser implements EnumTypeField {
  name: string;
  value: number;
  annotations: Annotation[];
  constructor(name: string, field: EnumTypeField) {
    this.name = name;
    this.value = field.value;
    this.annotations = field.annotations || [];
  }
  findAnnotation(predicate: (annot: Annotation) => boolean) {
    return this.annotations.find(predicate);
  }
}
export class ODataEnumTypeParser<T> implements Parser<T> {
  name: string;
  type: string;
  flags?: boolean;
  members: { [name: string]: number } | { [value: number]: string };
  fields: ODataEnumTypeFieldParser[];
  constructor(config: EnumTypeConfig<T>, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${config.name}`;
    this.flags = config.flags;
    this.members = config.members;
    this.fields = Object.entries(config.fields)
      .map(([name, f]) => new ODataEnumTypeFieldParser(name, f as EnumTypeField));
  }

  // Deserialize
  deserialize(value: string, options: OptionsHelper): T {
    // string -> Type
    if (this.flags) {
      return EnumHelper.toValues(this.members, value).reduce((acc, v) => acc | v, 0) as any;
    } else {
      return EnumHelper.toValue(this.members, value) as any;
    }
  }

  // Serialize
  serialize(value: T, options: OptionsHelper): string {
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
  toJsonSchema() {
    let property = <any>{
      title: this.name,
      type: "string"
    };
    property.enum = this.fields.map(f => f.name);
    return property;
  }
}
