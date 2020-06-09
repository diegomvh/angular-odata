import { Configuration } from '../types';
import { ODataConfig } from './config';
import { Types } from '../utils';

export class ODataSettings {
  configs?: Array<ODataConfig>;

  constructor(...configs: Configuration[]) {
    this.configs = configs.map(config => new ODataConfig(config));
    if (this.configs.length > 1 && this.configs.some(c => Types.isUndefined(c.name)))
      throw new Error("Multiple APIs mode needs configuration names");
    this.configs.forEach(config => config.configure());
  }

  public config(name?: string) {
    if (this.configs.length === 1) return this.configs[0];
    let config = this.configs.find(c => !Types.isUndefined(name) && c.name === name);
    if (config)
      return config;
  }

  public findConfigForTypes(types: string[]) {
    if (this.configs.length === 1) return this.configs[0];
    let config = this.configs.find(c => c.schemas.some(s => types.some(type => type.startsWith(s.namespace))));
    if (config)
      return config;
  }

  public configForType(type: string) {
    return this.findConfigForTypes([type]);
  }
}