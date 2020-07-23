import { Parser, JsonSchemaExpandOptions } from '../types';

export class ODataParser<Type> implements Parser<Type> {
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
  constructor(public name: string, public type: string) {}

  deserialize(value: any): Partial<Type> | Partial<Type>[] {
    return value; 
  }

  serialize(value: Partial<Type> | Partial<Type>[]): any {
    return value;
  }

  toJsonSchema(options: JsonSchemaExpandOptions<Type> = {}) {}

  configure(settings: { stringAsEnum: boolean, ieee754Compatible: boolean}) {
    this.stringAsEnum = settings.stringAsEnum;
    this.ieee754Compatible = settings.ieee754Compatible;
  }
}