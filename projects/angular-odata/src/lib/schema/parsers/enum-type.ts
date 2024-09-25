import { raw } from '../../resources/query';
import {
  EnumTypeConfig,
  EnumTypeFieldConfig,
  ParserOptions,
  FieldParser,
  JsonType,
} from '../../types';
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

export class ODataEnumTypeParser<E>
  extends ODataAnnotatable
  implements FieldParser<E>
{
  name: string;
  namespace: string;
  alias?: string;
  flags?: boolean;
  members: { [name: string]: number } | { [value: number]: string };
  private _fields: ODataEnumTypeFieldParser[];
  parserOptions?: ParserOptions;

  constructor(config: EnumTypeConfig, namespace: string, alias?: string) {
    super(config);
    this.name = config.name;
    this.namespace = namespace;
    this.alias = alias;
    this.flags = config.flags;
    this.members = config.members;
    this._fields = Object.entries(config.fields).map(
      ([name, f]) => new ODataEnumTypeFieldParser(name, f),
    );
  }

  configure({ options }: { options: ParserOptions }) {
    this.parserOptions = options;
  }

  isTypeOf(type: string) {
    var names = [`${this.namespace}.${this.name}`];
    if (this.alias) names.push(`${this.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  fields(namesValue?: string | number | number[]): ODataEnumTypeFieldParser[] {
    if (namesValue === undefined) return [...this._fields];
    if (Array.isArray(namesValue))
      return [...this._fields.filter((f) => namesValue.includes(f.value))];
    if (typeof namesValue === 'number') {
      return [
        ...this._fields.filter(
          (f) =>
            (this.flags && Boolean((<any>f.value) & (<any>namesValue))) ||
            f.value === namesValue,
        ),
      ];
    }
    if (typeof namesValue === 'string') {
      const names = namesValue.split(',').map((o) => o.trim());
      return this._fields.filter((f) => names.includes(f.name));
    }
    return [];
  }

  field(nameValue: string | number) {
    const field = this.fields().find(
      (f) => f.name === nameValue || f.value === nameValue,
    );
    //Throw error if not found
    //if (field === undefined)
    //  throw new Error(`${this.name} has no field for ${nameValue}`);
    return field;
  }

  /**
   * Map the fields of the enum type.
   * @param mapper Function that maps the value to the new value
   * @returns The fields mapped by the mapper
   */
  mapFields<R>(mapper: (field: ODataEnumTypeFieldParser) => R) {
    return this.fields().map(mapper);
  }

  // Deserialize
  deserialize(value: string, options?: ParserOptions): E {
    // string -> number
    const parserOptions = { ...this.parserOptions, ...options };
    if (this.flags) {
      return this.fields(value).reduce((acc, f) => acc | f.value, 0) as E;
    } else {
      return this.field(value)?.value as E;
    }
  }

  // Serialize
  serialize(value: number, options?: ParserOptions): string | undefined {
    // Enum are string | number
    // string | number -> string
    const parserOptions = { ...this.parserOptions, ...options };
    if (this.flags) {
      let names = this.fields(value).map((f) => f.name);
      if (names.length === 0) names = [`${value}`];
      return !parserOptions?.stringAsEnum
        ? `${this.namespace}.${this.name}'${names.join(', ')}'`
        : names.join(', ');
    } else {
      let name = this.field(value)?.name;
      if (name === undefined) name = `${value}`;
      return !parserOptions?.stringAsEnum
        ? `${this.namespace}.${this.name}'${name}'`
        : name;
    }
  }

  //Encode
  encode(value: number, options?: ParserOptions): any {
    const parserOptions = { ...this.parserOptions, ...options };
    const serialized = this.serialize(value, parserOptions);
    if (serialized === undefined) return undefined;
    return parserOptions?.stringAsEnum
      ? raw(`'${serialized}'`)
      : raw(serialized);
  }

  // Json Schema
  toJsonSchema() {
    return this.flags
      ? {
          title: this.name,
          type: JsonType.array,
          items: {
            type: JsonType.integer,
          },
        }
      : {
          type: JsonType.integer,
          enum: this._fields.map((f) => f.value),
        };
  }

  validate(
    value: string | number,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'modify';
      navigation?: boolean;
    } = {},
  ): string[] | undefined {
    if (this.flags) {
      let fields = this.fields(value);
      return value && fields.length === 0 ? ['mismatch'] : undefined;
    } else {
      return this.fields(value).length !== 1 ? ['mismatch'] : undefined;
    }
  }

  unpack(value: string | number): number[] {
    return this.fields(value).map((f) => f.value);
  }

  pack(value: string | number | number[]): number {
    return this.fields(value).reduce((acc, v) => acc | v.value, 0) as any;
  }
}
