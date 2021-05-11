import { CALLABLE_BINDING_PARAMETER } from '../constants';
import { Parser, Parameter, CallableConfig, StructuredTypeFieldOptions, NONE_PARSER, OptionsHelper } from '../types';

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

  configure({findParserForType, options}: {
    findParserForType: (type: string) => Parser<any>,
    options: OptionsHelper
  }) {
    this.parser = findParserForType(this.type);
  }
}

export class ODataCallableParser<R> implements Parser<R> {
  name: string;
  namespace: string;
  alias?: string;
  return?: { type: string, callable?: boolean};
  parser: Parser<any>;
  parameters: ODataParameterParser<any>[];
  constructor(config: CallableConfig, namespace: string, alias?: string) {
    this.name = config.name;
    this.namespace = namespace;
    this.alias = alias;
    this.return = config.return;
    this.parser = NONE_PARSER;
    this.parameters = Object.entries(config.parameters || [])
      .map(([name, p]) => new ODataParameterParser(name, p as Parameter));
  }
  isTypeOf(type: string) {
    var names = [`${this.namespace}.${this.name}`];
    if (this.alias)
      names.push(`${this.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
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

  configure({findParserForType, options}: {
    findParserForType: (type: string) => Parser<any>,
    options: OptionsHelper
  }) {
    if (this.return)
      this.parser = findParserForType(this.return.type) || NONE_PARSER;
    this.parameters.forEach(p => p.configure({findParserForType, options}));
  }

  binding() {
    return this.parameters.find(p => p.name === CALLABLE_BINDING_PARAMETER);
  }
}
