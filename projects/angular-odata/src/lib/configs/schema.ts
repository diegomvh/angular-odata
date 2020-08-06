import { ODataEntityConfig } from './entity';
import { ODataCallableConfig } from './callable';
import { ODataContainerConfig } from './container';
import { ODataEnumConfig } from './enum';
import { ODataApiConfig } from './api';
import { SchemaConfig, Parser } from '../types';
import { ODataServiceConfig } from './service';

export class ODataSchemaConfig {
  api: ODataApiConfig;
  namespace: string;
  alias?: string;
  enums?: Array<ODataEnumConfig<any>>;
  entities?: Array<ODataEntityConfig<any>>;
  callables?: Array<ODataCallableConfig<any>>;
  containers?: Array<ODataContainerConfig>;

  constructor(schema: SchemaConfig, api: ODataApiConfig) {
    this.api = api;
    this.namespace = schema.namespace;
    this.alias = schema.alias;
    this.enums = (schema.enums || []).map(config => new ODataEnumConfig(config, this));
    this.entities = (schema.entities || []).map(config => new ODataEntityConfig(config, this));
    // Merge callables
    let configs = (schema.callables || []);
    configs = configs.reduce((acc, config) => {
      if (acc.every(c => c.name !== config.name)) {
        config = configs.filter(c => c.name === config.name).reduce((acc, c) => {
          acc.parameters = Object.assign(acc.parameters || {}, c.parameters || {});
          return acc;
        }, config);
        return [...acc, config];
      }
      return acc;
    }, []);
    this.callables = configs.map(config => new ODataCallableConfig(config, this));
    this.containers = (schema.containers || []).map(container => new ODataContainerConfig(container, this));
  }

  isNamespaceOf(type: string) {
    return type.startsWith(this.namespace) || (this.alias && type.startsWith(this.alias));
  }

  get options() {
    return this.api.options;
  }

  get services(): Array<ODataServiceConfig> {
    return this.containers.reduce((acc, container) => [...acc, ...container.services], <ODataServiceConfig[]>[]);
  }

  configure(settings: { parserForType: (type: string) => Parser<any> }) {
    // Configure Entities
    this.entities
      .forEach(config => config.configure(settings));
    // Configure callables
    this.callables
      .forEach(callable => callable.configure(settings));
  }
}
