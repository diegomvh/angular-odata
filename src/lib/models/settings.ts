import { InjectionToken } from '@angular/core';
import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataModel } from './model';
import { ODataCollection } from './collection';
import { Meta, Parser } from '../types';
import { ODataMeta } from './meta';
import { ODataParser } from './parser';

export const ODATA_CONFIG = new InjectionToken<ODataConfig>('odata.config');

export type ODataConfig = {
  baseUrl: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  acceptMetadata?: 'minimal' | 'full' | 'none';
  stringAsEnum?: boolean,
  creation?: Date,
  version?: string,
  enums?: {[type: string]: {[key: number]: string | number}},
  metas?: {[type: string]: Meta<any> },
  models?: {[type: string]: any };
  collections?:{[type: string]: any };
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}

export class ODataSettings {
  baseUrl: string;
  metadataUrl?: string;
  withCredentials?: boolean;
  acceptMetadata?: 'minimal' | 'full' | 'none';
  creation?: Date;
  version?: string;
  stringAsEnum?: boolean;
  enums?: {[type: string]: {[key: number]: string | number}};
  parsers?: {[type: string]: ODataParser<any> };
  metas?: {[type: string]: ODataMeta<any> };
  models?: {[type: string]: any };
  collections?:{[type: string]: any };
  errorHandler?: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: ODataConfig) {
    this.baseUrl = config.baseUrl;
    this.metadataUrl = config.metadataUrl || `${config.baseUrl}$metadata`;
    this.withCredentials = config.withCredentials || false;
    this.acceptMetadata = config.acceptMetadata;
    this.stringAsEnum = config.stringAsEnum || false;
    this.creation = config.creation || new Date();
    this.errorHandler = config.errorHandler || null;

    this.enums = config.enums || {};
    this.models = config.models || {};
    this.collections = config.collections || {};

    // Build parsers
    this.parsers = Object.entries(config.metas || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataParser(config)}), {});

    // Configure Parsers
    Object.entries(this.parsers)
      .forEach(([type, parser]) => parser.configure(type, { 
        stringAsEnum: this.stringAsEnum, 
        enums: this.enums, 
        parsers: this.parsers 
      }));

    // Build metas
    this.metas = Object.entries(config.metas || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataMeta(config)}), {});

    // Configure Metas
    Object.entries(this.metas)
      .forEach(([type, meta]) => meta.configure(type, {
        parsers: this.parsers,
        metas: this.metas, 
        models: this.models, 
        collections: this.collections
      }));
  }

  public metaForType<E>(type: string): ODataMeta<E> {
    if (type in this.metas)
      return this.metas[type] as ODataMeta<E>;
  }

  public parserForType<T>(type: string): Parser<T> {
    if (type in this.parsers)
      return this.parsers[type] as ODataParser<T>;
  }

  public modelForType(type: string): typeof ODataModel {
    if (type in this.models)
      return this.models[type] as typeof ODataModel;
  }

  public collectionForType(type: string): typeof ODataCollection {
    if (type in this.collections)
      return this.collections[type] as typeof ODataCollection;
  }

}