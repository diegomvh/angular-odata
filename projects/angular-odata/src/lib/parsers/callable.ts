import { Types } from '../utils';
import { Parser, Options, Parameter, CallableConfig } from '../types';

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
  deserialize(value: any, options: Options): Type {
    return this.parser.deserialize(value, options);
    /*
    if (this.parser instanceof ODataEntityParser) {
      return Array.isArray(value) ?
        (value.map(v => this.parser.deserialize(v, options)) as Partial<Type>[]):
        (this.parser.deserialize(value, options) as Partial<Type>);
    } else if (this.parser instanceof ODataEnumParser) {
      return this.parser.deserialize(value, options);
    }
    */
  }

  // Serialize
  serialize(value: Type, options: Options): any {
    return this.parser.serialize(value, options);
    /*
    if (this.parser instanceof ODataEntityParser) {
      return Array.isArray(value) ?
        value.map(v => this.parser.serialize(v, options)) :
        this.parser.serialize(value, options);
    } else if (this.parser instanceof ODataEnumParser) {
      return this.parser.serialize(value, options);
    }
    */
  }

  configure(settings: { parserForType: (type: string) => Parser<any> | null }) {
    this.parser = settings.parserForType(this.type) || NONE_PARSER;
  }
}

export class ODataCallableParser<R> implements Parser<R> {
  name: string;
  //type: string;
  return?: string;
  parser: Parser<any>;
  parameters: ODataParameterParser<any>[];

  constructor(config: CallableConfig, namespace: string) {
    this.name = config.name;
    //this.type = `${namespace}.${config.name}`;
    this.return = config.return;
    this.parser = NONE_PARSER;
    this.parameters = Object.entries(config.parameters || [])
      .map(([name, p]) => new ODataParameterParser(name, p as Parameter));
  }

  // Deserialize
  deserialize(value: any, options: Options): R {
    return this.parser.deserialize(value, options);
  }

  // Serialize
  serialize(params: any, options: Options): any {
    return Object.assign({}, this.parameters
      .filter(p => p.name in params && !Types.isNullOrUndefined(params[p.name]))
      .reduce((acc, p) => Object.assign(acc, { [p.name]: p.serialize(params[p.name], options) }), {})
    );
  }

  configure(settings: { parserForType: (type: string) => Parser<any> | null }) {
    if (this.return)
      this.parser = settings.parserForType(this.return) || NONE_PARSER;
    this.parameters.forEach(p => p.configure(settings));
  }
}
