import { InjectionToken } from '@angular/core';
import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataModel } from './model';
import { ODataCollection } from './collection';
import { Meta, Parser } from '../types';
import { ODataMeta } from './meta';
import { ODataParser, PARSERS } from './parser';

export const ODATA_CONFIG = new InjectionToken<ODataConfig>('odata.config');

export type ODataConfig = {
  baseUrl: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  stringAsEnum?: boolean,
  creation?: Date,
  version?: string,
  enums?: {[type: string]: {[key: number]: string | number}},
  metas?: {[type: string]: Meta },
  models?: {[type: string]: { new(...any): ODataModel<any>} };
  collections?:{[type: string]: { new(...any): ODataCollection<any, ODataModel<any>> } };
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}

export class ODataSettings {
  baseUrl: string;
  metadataUrl?: string;
  withCredentials?: boolean;
  stringAsEnum?: boolean;
  creation?: Date;
  version?: string;
  enums?: {[type: string]: {[key: number]: string | number}};
  parsers?: {[type: string]: ODataParser<any> };
  metas?: {[type: string]: ODataMeta<any> };
  models?: {[type: string]: { new(...any): ODataModel<any>} };
  collections?:{[type: string]: { new(...any): ODataCollection<any, ODataModel<any>> } };
  errorHandler?: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: ODataConfig) {
    this.baseUrl = config.baseUrl;
    this.metadataUrl = config.metadataUrl || `${config.baseUrl}$metadata`;
    this.withCredentials = config.withCredentials || false;
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
      .forEach(([type, parser]) => parser.configure(type, this));

    // Build metas
    this.metas = Object.entries(config.metas || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new ODataMeta(config)}), {});

    // Configure Metas
    Object.entries(this.metas)
      .forEach(([type, meta]) => meta.configure(type, this));
  }

  public metaForType<E>(type: string): ODataMeta<E> {
    if (type in this.metas)
      return this.metas[type] as ODataMeta<E>;
  }

  public setForType<T>(type: string): string {
    let meta = this.metaForType(type) as ODataMeta<T>;
    return meta && meta.set;
  }

  public parserForType<T>(type: string): Parser<T> {
    let options = this.metaForType(type);
    if (!options && type in PARSERS) {
      return PARSERS[type];
    }
    return options.parser as Parser<T>;
  }

  public modelForType(type: string): typeof ODataModel {
    if (type in this.models)
      return this.models[type] as typeof ODataModel;
    return ODataModel;
  }

  public collectionForType(type: string): typeof ODataCollection {
    if (type in this.collections)
      return this.collections[type] as typeof ODataCollection;
    return ODataCollection;
  }

}