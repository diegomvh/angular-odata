import { raw } from '../../resources/query';
import {
  EnumTypeConfig,
  EnumTypeFieldConfig,
  ParserOptions,
  Parser,
} from '../../types';
import { Enums, Strings } from '../../utils';
import { ODataAnnotatable } from '../annotation';

export class ODataEnumTypeFieldParser extends ODataAnnotatable {
  name: string;
  value: number;

  constructor(name: string, field: EnumTypeFieldConfig) {
    super(field);
    this.name = name;
    this.value = field.value;
  }

  titleize(term?: string | RegExp): string {
    return (term && this.annotatedValue(term)) || this.name;
  }
}

export class ODataEnumTypeParser<T>
  extends ODataAnnotatable
  implements Parser<T>
{
  name: string;
  namespace: string;
  alias?: string;
  flags?: boolean;
  members: { [name: string]: number } | { [value: number]: string };
  fields: ODataEnumTypeFieldParser[];
  stringAsEnum?: boolean;
  optionsHelper?: ParserOptions;

  constructor(config: EnumTypeConfig<T>, namespace: string, alias?: string) {
    super(config);
    this.name = config.name;
    this.namespace = namespace;
    this.alias = alias;
    this.flags = config.flags;
    this.members = config.members;
    this.fields = Object.entries(config.fields).map(
      ([name, f]) => new ODataEnumTypeFieldParser(name, f)
    );
  }

  /**
   * Create a nicer looking title.
   * Titleize is meant for creating pretty output.
   * @param term The term of the annotation to find.
   * @returns The titleized string.
   */
  ttitelize(term?: string | RegExp): string {
    return (term && this.annotatedValue(term)) || Strings.titleCase(this.name);
  }

  configure({
    stringAsEnum,
    options,
  }: {
    stringAsEnum: boolean;
    options: ParserOptions;
  }) {
    this.stringAsEnum = stringAsEnum;
    this.optionsHelper = options;
  }

  isTypeOf(type: string) {
    var names = [`${this.namespace}.${this.name}`];
    if (this.alias) names.push(`${this.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  // Deserialize
  deserialize(value: string, options?: ParserOptions): T {
    // string -> number
    const parserOptions = options || this.optionsHelper;
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
  serialize(value: T, options?: ParserOptions): string {
    // Enum are string | number
    // string | number -> string
    const parserOptions = options || this.optionsHelper;
    if (this.flags) {
      const names = Enums.toNames(this.members, value);
      return !this.stringAsEnum
        ? `${this.namespace}.${this.name}'${names.join(', ')}'`
        : names.join(', ');
    } else {
      const name = Enums.toName(this.members, value);
      return !this.stringAsEnum
        ? `${this.namespace}.${this.name}'${name}'`
        : name;
    }
  }

  //Encode
  encode(value: T, options?: ParserOptions): any {
    const parserOptions = options || this.optionsHelper;
    const serialized = this.serialize(value, parserOptions);
    return this.stringAsEnum ? raw(`'${serialized}'`) : raw(serialized);
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
      method?: 'create' | 'update' | 'modify';
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
