import { ODataSchemaConfig } from './schema';
import { ServiceConfig } from '../types';

export class ODataServiceConfig {
  schema: ODataSchemaConfig
  name: string;
  annotations: any[];
  constructor(config: ServiceConfig, schema: ODataSchemaConfig) {
    this.schema = schema;
    this.name = config.name;
    this.annotations = config.annotations;
  }

  isTypeOf(type: string) {
    var names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias)
      names.push(`${this.schema.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  get options() {
    return this.schema.options;
  }
}