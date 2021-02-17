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
    this.parser = new ODataCallableParser(config, schema.namespace, schema.alias);
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
  type({alias = false}: {alias?: boolean} = {}) {
    return `${alias ? this.schema.alias : this.schema.namespace}.${this.name}`;
  }
  isTypeOf(type: string) {
    return this.parser.isTypeOf(type);
  }
  get api() {
    return this.schema.api;
  }

  configure(settings: { findParserForType: (type: string) => Parser<any> }) {
    const parserSettings = Object.assign({options: this.api.options}, settings);
    this.parser.configure(parserSettings);
  }
}
