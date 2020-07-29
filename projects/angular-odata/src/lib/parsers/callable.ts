import { Types } from '../utils';
import { Parser, ParseOptions, Parameter, CallableConfig } from '../types';

import { ODataEnumParser } from './enum';
import { ODataEntityParser } from './entity';

const NONE_PARSER = {
  deserialize: (value: any, options: ParseOptions) => value,
  serialize: (value: any, options: ParseOptions) => value
} as Parser<any>;

export class ODataParameterParser<Type> implements Parser<Type> {
  name: string;
  type: string;
  private parser?: Parser<Type>;
  collection?: boolean;
  nullable?: boolean;

  constructor(name: string, parameter: Parameter) {
    this.name = name;
    this.type = parameter.type;
    Object.assign(this, parameter);
  }

  // Deserialize
  deserialize(value: any, options: ParseOptions): Partial<Type> | Partial<Type>[] {
    if (this.parser instanceof ODataEntityParser) {
      return Array.isArray(value) ?
        (value.map(v => this.parser.deserialize(v, options)) as Partial<Type>[]):
        (this.parser.deserialize(value, options) as Partial<Type>);
    } else if (this.parser instanceof ODataEnumParser) {
      return this.parser.deserialize(value, options);
    }
    return this.parser.deserialize(value, options);
  }

  // Serialize
  serialize(value: Partial<Type> | Partial<Type>[], options: ParseOptions): any {
    if (this.parser instanceof ODataEntityParser) {
      return Array.isArray(value) ?
        value.map(v => this.parser.serialize(v, options)) :
        this.parser.serialize(value, options);
    } else if (this.parser instanceof ODataEnumParser) {
      return this.parser.serialize(value, options);
    }
    return this.parser.serialize(value, options);
  }

  configure(settings: { parserForType: (type: string) => Parser<any> }) {
    this.parser = settings.parserForType(this.type) || NONE_PARSER;
  }
}

export class ODataCallableParser implements Parser<any> {
  name: string;
  type: string;
  return?: string;
  parser: Parser<any>;
  parameters: ODataParameterParser<any>[];

  constructor(config: CallableConfig, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${config.name}`;
    this.return = config.return;
    this.parameters = Object.entries(config.parameters || [])
      .map(([name, p]) => new ODataParameterParser(name, p as Parameter));
  }

  // Deserialize
  deserialize(value: any, options: ParseOptions): Partial<any> | Partial<any>[] {
    return this.parser.deserialize(value, options);
  }

  // Serialize
  serialize(entity: Partial<any>, options: ParseOptions): any {
    return Object.assign({}, this.parameters
      .filter(p => p.name in entity && !Types.isNullOrUndefined(entity[p.name]))
      .reduce((acc, p) => Object.assign(acc, { [p.name]: p.serialize(entity[p.name], options) }), {})
    );
  }

  configure(settings: { parserForType: (type: string) => Parser<any> }) {
    if (this.return)
      this.parser = settings.parserForType(this.return) || NONE_PARSER;
    this.parameters.forEach(p => p.configure(settings));
  }
}