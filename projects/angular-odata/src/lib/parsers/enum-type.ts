import { Enums } from '../utils';
import { raw } from '../resources/builder';
import { ODataAnnotation } from '../schema/annotation';
import {
  EnumTypeConfig,
  Parser,
  OptionsHelper,
  EnumTypeFieldConfig,
  Options,
} from '../types';
import { ODataParserOptions } from '../options';

export class ODataEnumTypeFieldParser {
  name: string;
  value: number;
  annotations: ODataAnnotation[];

  constructor(name: string, field: EnumTypeFieldConfig) {
    this.name = name;
    this.value = field.value;
    this.annotations = (field.annotations || []).map(
      (annot) => new ODataAnnotation(annot)
    );
  }

  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }
}

export class ODataEnumTypeParser<T> implements Parser<T> {
  name: string;
  namespace: string;
  alias?: string;
  flags?: boolean;
  members: { [name: string]: number } | { [value: number]: string };
  fields: ODataEnumTypeFieldParser[];
  optionsHelper?: OptionsHelper;

  constructor(config: EnumTypeConfig<T>, namespace: string, alias?: string) {
    this.name = config.name;
    this.namespace = namespace;
    this.alias = alias;
    this.flags = config.flags;
    this.members = config.members;
    this.fields = Object.entries(config.fields).map(
      ([name, f]) => new ODataEnumTypeFieldParser(name, f)
    );
  }

  configure({ options }: { options: OptionsHelper }) {
    this.optionsHelper = options;
  }

  isTypeOf(type: string) {
    var names = [`${this.namespace}.${this.name}`];
    if (this.alias) names.push(`${this.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  // Deserialize
  deserialize(value: string, options?: Options): T {
    // string -> number
    const parserOptions =
      options !== undefined
        ? new ODataParserOptions(options)
        : this.optionsHelper;
    if (this.flags) {
      return Enums.toValues(this.members, value).reduce(
        (acc, v) => acc | v,
        0
      ) as any;
    } else {
      return Enums.toValue(this.members, value) as any;
    }
  }

  // Serialize
  serialize(value: T, options?: Options): string {
    // Enum are string | number
    // string | number -> string
    const parserOptions =
      options !== undefined
        ? new ODataParserOptions(options)
        : this.optionsHelper;
    if (this.flags) {
      const names = Enums.toNames(this.members, value);
      return !parserOptions?.stringAsEnum
        ? `${this.namespace}.${this.name}'${names.join(', ')}'`
        : names.join(', ');
    } else {
      const name = Enums.toName(this.members, value);
      return !parserOptions?.stringAsEnum
        ? `${this.namespace}.${this.name}'${name}'`
        : name;
    }
  }

  //Encode
  encode(value: T, options?: Options): any {
    const parserOptions =
      options !== undefined
        ? new ODataParserOptions(options)
        : this.optionsHelper;
    const serialized = this.serialize(value, parserOptions);
    return parserOptions?.stringAsEnum
      ? raw(`'${serialized}'`)
      : raw(serialized);
  }

  // Json Schema
  toJsonSchema() {
    let property = <any>{
      title: this.name,
      type: 'string',
    };
    property.enum = this.fields.map((f) => f.name);
    return property;
  }

  validate(
    member: string | number,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'patch';
      navigation?: boolean;
    } = {}
  ): string[] | undefined {
    if (this.flags) {
      let members = Enums.toValues(this.members, member);
      return members.some((member) => !(member in this.members))
        ? ['mismatch']
        : undefined;
    } else {
      return !(member in this.members) ? ['mismatch'] : undefined;
    }
  }
}
