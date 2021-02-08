import { CALLABLE_BINDING_PARAMETER } from '../constants';
import { Parser, Parameter, CallableConfig, StructuredTypeFieldOptions, NONE_PARSER } from '../types';

export class ODataParameterParser<T> {
  name: string;
  type: string;
  private parser: Parser<T>;
  collection?: boolean;
  nullable?: boolean;

  constructor(name: string, parameter: Parameter) {
    this.name = name;
    this.type = parameter.type;
    this.parser = NONE_PARSER;
    Object.assign(this, parameter);
  }

  serialize(value: T, options: StructuredTypeFieldOptions): any {
    return Array.isArray(value) ?
      value.map(v => this.parser.serialize(v, options)) :
      this.parser.serialize(value, options);
  }

  configure(settings: { findParserForType: (type: string) => Parser<any> }) {
    this.parser = settings.findParserForType(this.type);
  }
}

export class ODataCallableParser<R> implements Parser<R> {
  name: string;
  type: string;
  return?: { type: string, callable?: boolean};
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
    return Object.assign({}, this.parameters.filter(p => p.name !== CALLABLE_BINDING_PARAMETER)
      .filter(p => p.name in params && params[p.name] !== undefined)
      .reduce((acc, p) => Object.assign(acc, { [p.name]: p.serialize(params[p.name], options) }), {})
    );
  }

  configure(settings: { findParserForType: (type: string) => Parser<any> }) {
    if (this.return)
      this.parser = settings.findParserForType(this.return.type) || NONE_PARSER;
    this.parameters.forEach(p => p.configure(settings));
  }

  binding() {
    return this.parameters.find(p => p.name === CALLABLE_BINDING_PARAMETER);
  }
}
