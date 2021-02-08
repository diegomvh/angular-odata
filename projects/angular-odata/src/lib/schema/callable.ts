import { Parser, CallableConfig } from '../types';
import { ODataSchema } from './schema';
import { ODataCallableParser } from '../parsers';

export class ODataCallable<R> {
  schema: ODataSchema;
  name: string;
  entitySetPath?: string;
  bound?: boolean;
  composable?: boolean;
  parser: ODataCallableParser<R>;

  constructor(config: CallableConfig, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.entitySetPath = config.entitySetPath;
    this.bound = config.bound;
    this.composable = config.composable;
    this.parser = new ODataCallableParser(config, schema.namespace);
  }

  path() {
    let path: string;
    if (this.entitySetPath)
      path = this.entitySetPath;
    else if (this.bound)
      path = `${this.schema.namespace}.${this.name}`;
    else
      path = this.parser.return ? this.api.findEntitySetForType(this.parser.return.type)?.name || this.name : this.name;
    return path;
  }

  isTypeOf(type: string) {
    var names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias)
      names.push(`${this.schema.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  get api() {
    return this.schema.api;
  }

  configure(settings: { findParserForType: (type: string) => Parser<any> }) {
    const parserSettings = Object.assign({options: this.api.options}, settings);
    this.parser.configure(parserSettings);
  }
}
