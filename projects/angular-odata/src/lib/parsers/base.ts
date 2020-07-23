import { Parser, JsonSchemaExpandOptions, DeserializeOptions, SerializeOptions } from '../types';

export class ODataParser<Type> implements Parser<Type> {
  constructor(public name: string, public type: string) {}
  deserialize(value: any, options: DeserializeOptions): Partial<Type> | Partial<Type>[] { 
    return value; 
  }
  serialize(value: Partial<Type> | Partial<Type>[], options: SerializeOptions): any { 
    return value; 
  }
  toJsonSchema(options: JsonSchemaExpandOptions<Type> = {}) {}
}

export const NONE_PARSER = new ODataParser("None", "None");