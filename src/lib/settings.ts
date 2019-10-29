import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataResource } from './resources';
import { Model, ModelCollection } from './models';
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
  models?: {[type: string]: { new(attrs: PlainObject, query: ODataResource<any>): Model }},
  collections?:{[type: string]: { new(models: PlainObject[], query: ODataResource<any>): ModelCollection<Model> }},
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
  models?: {[type: string]: { new(attrs: PlainObject, query: ODataResource<any>): Model }};
  collections?:{[type: string]: { new(models: PlainObject[], query: ODataResource<any>): ModelCollection<Model> }};
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

    // Set schema
    Object.entries(this.models)
      .forEach(([type, model]) => {
        (model as typeof Model).schema = this.schemas[type] as Schema<any>;
      });

    // Configure
    Object.values(this.schemas)
      .forEach(schema => schema.configure(this));
  }

  public schemaForType<E>(type): Schema<E> {
    if (type in this.schemas)
      return this.schemas[type] as Schema<E>;
  }

}