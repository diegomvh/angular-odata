import { Configuration } from '../types';
import { ODataConfig } from './config';
import { Types } from '../utils';
import { ODataParser } from '../parsers';

export class ODataSettings {
  configs?: Array<ODataConfig>;

  constructor(configs: Configuration[]) {
    this.configs = configs.map(config => new ODataConfig(config));
    if (this.configs.length > 1 && this.configs.some(c => Types.isUndefined(c.name)))

    this.configs.forEach(config => config.configure({
      parserForType: (type: string) => this.parserForType(type)
    }));
  }

  public config(name?: string) {
    if (this.configs.length === 1) return this.configs[0];
    let config = this.configs.find(c => !Types.isUndefined(name) && c.name === name);
    if (config)
      return config;
    throw new Error(`The configuration with name '${name}' does not exists`);
  }

  public configForNamespace(namespace: string) {
    if (this.configs.length === 1) return this.configs[0];
    let config = this.configs.find(c => c.schemas.some(s => namespace.startsWith(s.namespace)));
    if (config)
      return config;
    throw new Error(`The namespace: '${namespace}' does not belong to any known configuration`);
  }

  public parserForType<T>(type: string): ODataParser<T> {
    let config = this.configForNamespace(type);
    return config.parserForType(type);
  }
}