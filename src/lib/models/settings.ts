import { Configuration } from '../types';
import { ODataConfig } from './config';
import { Types } from '../utils';
import { ODataCollection } from './collection';
import { ODataModel } from './model';

export class ODataSettings {
  configs?: Array<ODataConfig>;

  constructor(...configs: Configuration[]) {
    this.configs = configs.map(config => new ODataConfig(config));
    if (this.configs.length > 1 && this.configs.some(c => Types.isUndefined(c.name)))
      throw new Error("Multiple APIs: Needs configuration names");
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

  // Configs shortcuts
  public enumConfigForName<T>(name: string) {
    let values = this.configs.map(config => config.enumConfigForName<T>(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public entityConfigForName<T>(name: string) {
    let values = this.configs.map(config => config.entityConfigForName<T>(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public serviceConfigForName(name: string) {
    let values = this.configs.map(config => config.serviceConfigForName(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public modelForName(name: string): typeof ODataModel {
    let values = this.configs.map(config => config.modelForName(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public collectionForName(name: string): typeof ODataCollection {
    let values = this.configs.map(config => config.collectionForName(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }
}