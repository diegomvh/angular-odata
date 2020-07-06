import { Types, Enums } from '../utils';
import { Parser, Field, JsonSchemaExpandOptions, JsonSchemaConfig, EntityConfig, EnumConfig } from '../types';

export class ODataParser<Type> implements Parser<Type> {
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
  constructor(public name: string, public type: string) {}

  deserialize(value: any): Type | Type[] {
    return value;
  }

  serialize(value: Partial<Type> | Array<Partial<Type>>): any {
    return value;
  }

  toJsonSchema(config: JsonSchemaConfig<Type> = {}) {}

  configure(settings: { stringAsEnum: boolean, ieee754Compatible: boolean}) {
    this.stringAsEnum = settings.stringAsEnum;
    this.ieee754Compatible = settings.ieee754Compatible;
  }
}
