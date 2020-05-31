import { Configuration } from '../types';
import { ODataConfig, ODataEnumConfig, ODataEntityConfig } from './config';
import { Types } from '../utils';
import { ODataModel } from './model';
import { ODataCollection } from './collection';
import { ODataParser } from '../parsers';

export class ODataSettings {
  configs?: Array<ODataConfig>;

  constructor(configs: Configuration[]) {
    this.configs = configs.map(config => new ODataConfig(config));
  }

  public configForType(type: string) {
    if (this.configs.length === 1) return this.configs[0];
    let config = this.configs.find(c => c.schemas.some(s => type.startsWith(s.namespace)));
    if (config)
      return config;
    throw new Error(`The type: ${type} does not belong to any known configuration`);
  }

  //#region Find Config
  public enumConfigForType<T>(type: string) {
    let config = this.configForType(type);
    if (config)
      return config.enumConfigForType(type) as ODataEnumConfig<T>;
  }

  public entityConfigForType<T>(type: string) {
    let config = this.configForType(type);
    if (config)
      return config.entityConfigForType(type) as ODataEntityConfig<T>;
  }

  public serviceConfigForType(type: string) {
    let config = this.configForType(type);
    if (config)
      return config.serviceConfigForType(type);
  }
  //#endregion

  //#region Model and Collection for type
  public modelForType(type: string): typeof ODataModel {
    let config = this.entityConfigForType(type);
    if (!Types.isUndefined(config))
      return config.model as typeof ODataModel;
  }

  public collectionForType(type: string): typeof ODataCollection {
    let config = this.entityConfigForType(type);
    if (!Types.isUndefined(config))
      return config.collection as typeof ODataCollection;
  }
  //#endregion
  public parserForType<T>(type: string): ODataParser<T> {
    let config = this.enumConfigForType(type) || this.entityConfigForType(type);
    if (!Types.isUndefined(config))
      return config.parser as ODataParser<T>;
  }
}