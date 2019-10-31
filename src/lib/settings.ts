import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataResource } from './resources';
import { ODataModel, ODataModelCollection } from './models';
import { InjectionToken } from '@angular/core';
import { Schema, Field } from './schema';
import { PlainObject } from './types';

export const ODATA_CONFIG = new InjectionToken<ODataConfig>('odata.config');

export interface ODataConfig {
  baseUrl: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  stringAsEnum?: boolean,
  maxSize?: number,
  creation?: Date,
  version?: string,
  enums?: {[type: string]: {[key: number]: string | number}},
  schemas?: {[type: string]: {[name: string]: Field }},
  models?: {[type: string]: typeof ODataModel },
  collections?:{[type: string]: typeof ODataModelCollection },
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}

export class ODataSettings {
  baseUrl: string;
  metadataUrl?: string;
  withCredentials?: boolean;
  stringAsEnum?: boolean;
  maxSize?: number;
  creation?: Date;
  version?: string;
  enums?: {[type: string]: {[key: number]: string | number}};
  schemas?: {[type: string]: Schema<any> };
  models?: {[type: string]: typeof ODataModel };
  collections?:{[type: string]: typeof ODataModelCollection };
  errorHandler?: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: ODataConfig) {
    this.baseUrl = config.baseUrl;
    this.metadataUrl = config.metadataUrl || `${config.baseUrl}$metadata`;
    this.withCredentials = config.withCredentials || false;
    this.stringAsEnum = config.stringAsEnum || false;
    this.maxSize = config.maxSize || 20;
    this.creation = config.creation || new Date();
    this.errorHandler = config.errorHandler || null;

    this.enums = config.enums || {};
    this.models = config.models || {};
    this.collections = config.collections || {};

    // Build schemas
    this.schemas = Object.entries(config.schemas || {})
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new Schema(config)}), {});

    // Configure
    Object.values(this.schemas)
      .forEach(schema => schema.configure(this));
  }

  public schemaForType<E>(type: string): Schema<E> {
    if (type in this.schemas)
      return this.schemas[type] as Schema<E>;
  }

  public modelForType(type: string): typeof ODataModel {
    if (type in this.models)
      return this.models[type] as typeof ODataModel;
  }

  public collectionForType(type: string): typeof ODataModelCollection {
    if (type in this.collections)
      return this.collections[type] as typeof ODataModelCollection;
  }

}