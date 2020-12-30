import { Parser, Options, Parameter, CallableConfig, OptionsHelper, StructuredTypeFieldOptions } from '../types';

const NONE_PARSER = {
  deserialize(value: any, options: Options) {return value},
  serialize(value: any, options: Options) {return value}
} as Parser<any>;

export class ODataParameterParser<Type> implements Parser<Type> {
  name: string;
  type: string;
  private parser: Parser<Type>;
  collection?: boolean;
  nullable?: boolean;

  constructor(name: string, parameter: Parameter) {
    this.name = name;
    this.type = parameter.type;
    this.parser = NONE_PARSER;
    Object.assign(this, parameter);
  }

  // Deserialize
  deserialize(value: any, options: StructuredTypeFieldOptions): Type {
    return this.parser.deserialize(value, options);
  }

  // Serialize
  serialize(value: Type, options: StructuredTypeFieldOptions): any {
    return this.parser.serialize(value, options);
  }

  configure(settings: { findParserForType: (type: string) => Parser<any> | undefined }) {
    this.parser = settings.findParserForType(this.type) || NONE_PARSER;
  }
}

export class ODataCallableParser<R> implements Parser<R> {
  name: string;
  type: string;
  return?: string;
  parser: Parser<any>;
  parameters: ODataParameterParser<any>[];
  constructor(config: CallableConfig, namespace: string) {
    this.name = config.name;
    this.type = `${namespace}.${config.name}`;
    this.return = config.return;
    this.parser = NONE_PARSER;
    this.parameters = Object.entries(config.parameters || [])
      .map(([name, p]) => new ODataParameterParser(name, p as Parameter));
  }

  // Deserialize
  deserialize(value: any, options: StructuredTypeFieldOptions): R {
    return this.parser.deserialize(value, options);
  }

  // Serialize
  serialize(params: any, options: StructuredTypeFieldOptions): any {
    return Object.assign({}, this.parameters
      .filter(p => p.name in params && params[p.name] !== undefined)
      .reduce((acc, p) => Object.assign(acc, { [p.name]: p.serialize(params[p.name], options) }), {})
    );
  }
  configure(settings: { findParserForType: (type: string) => Parser<any> | undefined }) {
    if (this.return)
      this.parser = settings.findParserForType(this.return) || NONE_PARSER;
    this.parameters.forEach(p => p.configure(settings));
  }
}
