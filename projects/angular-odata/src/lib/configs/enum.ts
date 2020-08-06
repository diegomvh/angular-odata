import { ODataSchemaConfig } from './schema';
import { ODataEnumParser } from '../parsers';
import { EnumConfig } from '../types';

export class ODataEnumConfig<Type> {
  schema: ODataSchemaConfig;
  name: string;
  parser?: ODataEnumParser<Type>;
  members: { [name: string]: number } | { [value: number]: string };
  constructor(enu: EnumConfig<Type>, schema: ODataSchemaConfig) {
    this.schema = schema;
    this.name = enu.name;
    this.members = enu.members;
    this.parser = new ODataEnumParser(enu as EnumConfig<any>, schema.namespace);
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
}
