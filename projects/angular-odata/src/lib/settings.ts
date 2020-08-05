import { ApiConfig, Parser } from './types';
import { ODataApiConfig } from './config';
import { Types } from './utils';
import { ODataCollection } from './models/collection';
import { ODataModel } from './models/model';

export class ODataSettings {
  configs?: Array<ODataApiConfig>;

  constructor(...configs: ApiConfig[]) {
    this.configs = configs.map(config => new ODataApiConfig(config));
    if (this.configs.length > 1) {
      if (this.configs.some(c => Types.isUndefined(c.name)))
        throw new Error("Multiple APIs: Needs configuration names");
      if (this.configs.filter(c => c.default).length > 1)
        throw new Error("Multiple APIs: Needs only one default api");
    }
    // If not default setup first config as default api
    if (this.configs.every(c => !c.default))
      this.configs[0].default = true;
    this.configs.forEach(config => config.configure());
  }

  public apiConfig(name?: string) {
    if (this.configs.length > 1 && !Types.isUndefined(name)) {
      const config = this.configs.find(c => c.name === name);
      return config || this.configs.find(c => c.default);
    }
    return this.configs.find(c => c.default);
  }

  public apiConfigForTypes(types: string[]) {
    if (this.configs.length > 1) {
      const config = this.configs.find(c => c.schemas.some(s => types.some(type => s.isNamespaceOf(type))));
      return config || this.configs.find(c => c.default);
    }
    return this.configs.find(c => c.default);
  }

  public apiConfigForType(type: string) {
    return this.apiConfigForTypes([type]);
  }

  //#region Configs shortcuts
  public enumConfigForType<T>(type: string) {
    let values = this.configs.map(config => config.enumConfigForType<T>(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public entityConfigForType<T>(type: string) {
    let values = this.configs.map(config => config.entityConfigForType<T>(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public callableConfigForType<T>(type: string) {
    let values = this.configs.map(config => config.callableConfigForType<T>(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public serviceConfigForType(type: string) {
    let values = this.configs.map(config => config.serviceConfigForType(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public parserForType<T>(type: string): Parser<T> {
    let values = this.configs.map(config => config.parserForType<T>(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0] as Parser<T>;
  }

  public modelForType(type: string): typeof ODataModel {
    let values = this.configs.map(config => config.modelForType(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public collectionForType(type: string): typeof ODataCollection {
    let values = this.configs.map(config => config.collectionForType(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

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
  //#endregion
}