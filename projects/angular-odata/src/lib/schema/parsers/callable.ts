import { CALLABLE_BINDING_PARAMETER } from '../../constants';
import {
  CallableConfig,
  NONE_PARSER,
  ParserOptions,
  Parameter,
  Parser,
} from '../../types';
import { ODataEnumTypeParser } from './enum-type';
import { ODataStructuredTypeParser } from './structured-type';

export class ODataParameterParser<T> {
  name: string;
  type: string;
  private parser: Parser<T>;
  collection?: boolean;
  nullable?: boolean;
  parserOptions?: ParserOptions;

  constructor(name: string, parameter: Parameter) {
    this.name = name;
    this.type = parameter.type;
    this.parser = NONE_PARSER;
    this.nullable = parameter.nullable;
    this.collection = parameter.collection;
  }

  serialize(value: T, options?: ParserOptions): any {
    const parserOptions = options || this.parserOptions;
    return Array.isArray(value)
      ? value.map((v) => this.parser.serialize(v, parserOptions))
      : this.parser.serialize(value, parserOptions);
  }

  //Encode
  encode(value: any, options?: ParserOptions): string {
    const parserOptions = options || this.parserOptions;
    return Array.isArray(value)
      ? value.map((v) => this.parser.encode(v, parserOptions))
      : this.parser.encode(value, parserOptions);
  }

  configure({
    parserForType,
    options,
  }: {
    parserForType: (type: string) => Parser<any>;
    options: ParserOptions;
  }) {
    this.parserOptions = options;
    this.parser = parserForType(this.type);
  }

  isEdmType() {
    return this.type.startsWith('Edm.');
  }

  isEnumType() {
    return this.parser instanceof ODataEnumTypeParser;
  }

  enum() {
    if (!this.isEnumType()) throw new Error('Field are not EnumType');
    return this.parser as ODataEnumTypeParser<T>;
  }

  isStructuredType() {
    return this.parser instanceof ODataStructuredTypeParser;
  }

  structured() {
    if (!this.isStructuredType())
      throw new Error('Field are not StrucuturedType');
    return this.parser as ODataStructuredTypeParser<T>;
  }
}

export class ODataCallableParser<R> implements Parser<R> {
  name: string;
  namespace: string;
  alias?: string;
  return?: { type: string; collection?: boolean };
  parser: Parser<any>;
  parameters: ODataParameterParser<any>[];
  nonParenthesisForEmptyParameterFunction?: boolean;
  parserOptions?: ParserOptions;

  constructor(config: CallableConfig, namespace: string, alias?: string) {
    this.name = config.name;
    this.namespace = namespace;
    this.alias = alias;
    this.return = config.return;
    this.parser = NONE_PARSER;
    this.parameters = Object.entries(config.parameters || []).map(
      ([name, p]) => new ODataParameterParser(name, p as Parameter)
    );
  }

  isTypeOf(type: string) {
    var names = [`${this.namespace}.${this.name}`];
    if (this.alias) names.push(`${this.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  // Deserialize
  deserialize(value: any, options?: ParserOptions): R {
    const parserOptions = options || this.parserOptions;
    return this.parser.deserialize(value, parserOptions);
  }

  // Serialize
  serialize(params: any, options?: ParserOptions): any {
    const parserOptions = options || this.parserOptions;
    const parameters = this.parameters
      .filter((p) => p.name !== CALLABLE_BINDING_PARAMETER)
      .filter((p) => p.name in params && params[p.name] !== undefined);
    return parameters.reduce(
      (acc, p) => ({
        ...acc,
        [p.name]: p.serialize(params[p.name], parserOptions),
      }),
      {}
    );
  }

  //Encode
  encode(params: any, options?: ParserOptions): any {
    const parserOptions = options || this.parserOptions;
    const parameters = this.parameters
      .filter((p) => p.name !== CALLABLE_BINDING_PARAMETER)
      .filter((p) => p.name in params && params[p.name] !== undefined);
    return parameters.reduce(
      (acc, p) => ({
        ...acc,
        [p.name]: p.encode(params[p.name], parserOptions),
      }),
      {}
    );
  }

  configure({
    nonParenthesisForEmptyParameterFunction,
    parserForType,
    options,
  }: {
    nonParenthesisForEmptyParameterFunction: boolean;
    parserForType: (type: string) => Parser<any>;
    options: ParserOptions;
  }) {
    this.nonParenthesisForEmptyParameterFunction =
      nonParenthesisForEmptyParameterFunction;
    this.parserOptions = options;
    if (this.return)
      this.parser = parserForType(this.return.type) || NONE_PARSER;
    this.parameters.forEach((p) => p.configure({ parserForType, options }));
  }

  binding() {
    return this.parameters.find((p) => p.name === CALLABLE_BINDING_PARAMETER);
  }
}
