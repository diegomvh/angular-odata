import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataResource } from './resources';
import { Model, ModelCollection } from './models';
import { InjectionToken } from '@angular/core';
import { Schema, Field, Key } from './schema';
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
  schemas?: {[type: string]: {base?: string, keys?: Key[], fields?: Field[] }},
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
    // Bases
    let bases = Object.entries(config.schemas || {})
      .filter(([, config]) => !('base' in config));
    // Descendants
    let descendants = Object.entries(config.schemas || {})
      .filter(([, config]) => 'base' in config);

    let schemas = bases.reduce((acc, [type, config]) => 
      Object.assign(acc, {[type]: new Schema(config.keys, config.fields)}), {});

    while (descendants.length > 0) {
      let descendant = descendants.find(([, config]) => config.base in schemas);
      schemas[descendant[0]] = schemas[descendant[1].base].extend(descendant[1].keys, descendant[1].fields) as Schema<any>;
      descendants = descendants.filter(d => d !== descendant);
    }
    this.schemas = schemas;

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