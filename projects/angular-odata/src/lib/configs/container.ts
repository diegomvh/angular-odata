import { ODataSchemaConfig } from './schema';
import { ContainerConfig } from '../types';
import { ODataServiceConfig } from './service';

export class ODataContainerConfig {
  schema: ODataSchemaConfig;
  name: string;
  annotations: any[];
  services?: Array<ODataServiceConfig>;
  constructor(config: ContainerConfig, schema: ODataSchemaConfig) {
    this.schema = schema;
    this.name = config.name;
    this.annotations = config.annotations;
    this.services = (config.services || []).map(config => new ODataServiceConfig(config, schema));
  }

  get options() {
    return this.schema.options;
  }
}
