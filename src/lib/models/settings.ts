import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataModel } from './model';
import { ODataCollection } from './collection';
import { Settings } from '../types';
import { ODataEntityConfig, ODataEnumConfig, ODataApiConfig, ODataServiceConfig, ODataConfig } from './config';
import { ODataParser } from '../parsers';
import { Types } from '../utils';

export class ODataSettings {
  baseUrl: string;
  metadataUrl?: string;
  withCredentials?: boolean;
  acceptMetadata?: 'minimal' | 'full' | 'none';
  creation?: Date;
  version?: string;
  stringAsEnum?: boolean;
  configs?: {[type: string]: ODataConfig };
  errorHandler?: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: Settings) {
    this.baseUrl = config.baseUrl;
    this.metadataUrl = config.metadataUrl || `${config.baseUrl}$metadata`;
    this.withCredentials = config.withCredentials || false;
    this.acceptMetadata = config.acceptMetadata;
    this.stringAsEnum = config.stringAsEnum || false;
    this.creation = config.creation || new Date();
    this.errorHandler = config.errorHandler || null;

    this.configs = Object.entries(config.apis || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataApiConfig(config)}), {});

    Object.entries(config.enums || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataEnumConfig(config, this.stringAsEnum)}), this.configs);

    Object.entries(config.entities || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataEntityConfig(config)}), this.configs);

    Object.entries(config.services || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataServiceConfig(config)}), this.configs);

    Object.entries(this.configs)
      .forEach(([, config]) => config.configure(this));
  }

  public configForType(type: string) {
    if (type in this.configs)
      return this.configs[type];
  }

  public enumConfigForType<T>(type: string) {
    let config = this.configForType(type);
    if (config instanceof ODataEnumConfig)
      return config as ODataEnumConfig<T>;
  }

  public entityConfigForType<T>(type: string) {
    let config = this.configForType(type);
    if (config instanceof ODataEntityConfig)
      return config as ODataEntityConfig<T>;
  }

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

  public parserForType<T>(type: string): ODataParser<T> {
    let config = this.enumConfigForType(type) || this.entityConfigForType(type);
    if (!Types.isUndefined(config))
      return config.parser as ODataParser<T>;
  }

}