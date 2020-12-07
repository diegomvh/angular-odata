import { ODataSchema } from './schema';
import { ODataEnumFieldParser, ODataEnumParser } from '../parsers';
import { EnumTypeConfig } from '../types';

export class ODataEnumType<E> {
  schema: ODataSchema;
  name: string;
  parser?: ODataEnumParser<E>;
  members: { [name: string]: number } | { [value: number]: string };
  constructor(enu: EnumTypeConfig<E>, schema: ODataSchema) {
    this.schema = schema;
    this.name = enu.name;
    this.members = enu.members;
    this.parser = new ODataEnumParser(enu as EnumTypeConfig<any>, schema.namespace);
  }

  isTypeOf(type: string) {
    var names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias)
      names.push(`${this.schema.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  get options() {
    return this.schema.options;
  }

  fields(): ODataEnumFieldParser<any>[] {
    return this.parser?.fields || [];
  }

  findField(name: string) {
    return this.fields().find(f => f.name === name);
  }
}
