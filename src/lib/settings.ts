import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { PlainObject, ODataRequest } from './odata-request';
import { Model, ModelCollection, EntitySchema, ModelSchema } from './odata-model';
import { InjectionToken } from '@angular/core';
import { Schema, Field, Key } from './odata-model/schema';

export const ODATA_CONFIG = new InjectionToken<ODataConfig>('odata.config');

export interface ODataConfig {
  baseUrl: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  withCount?: boolean,
  stringAsEnum?: boolean,
  maxPageSize?: number,
  creation?: Date,
  version?: string,
  enums?: {[type: string]: {[key: number]: string | number}},
  schemas?: {[type: string]: {base?: string, keys?: Key[], fields?: Field[] }},
  models?: {[type: string]: { new(attrs: PlainObject, query: ODataRequest): Model }},
  collections?:{[type: string]: { new(models: PlainObject[], query: ODataRequest): ModelCollection<Model> }},
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}

export class ODataSettings {
  baseUrl: string;
  metadataUrl?: string;
  withCredentials?: boolean;
  withCount?: boolean;
  stringAsEnum?: boolean;
  maxPageSize?: number;
  creation?: Date;
  version?: string;
  enums?: {[type: string]: {[key: number]: string | number}};
  schemas?: {[type: string]: Schema<Key, Field, any> };
  models?: {[type: string]: { new(attrs: PlainObject, query: ODataRequest): Model }};
  collections?:{[type: string]: { new(models: PlainObject[], query: ODataRequest): ModelCollection<Model> }};
  errorHandler?: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: ODataConfig) {
    this.baseUrl = config.baseUrl;
    this.metadataUrl = config.metadataUrl || `${config.baseUrl}$metadata`;
    this.withCredentials = config.withCredentials || false;
    this.withCount = config.withCount || true;
    this.stringAsEnum = config.stringAsEnum || false;
    this.maxPageSize = config.maxPageSize || 20;
    this.creation = config.creation || new Date();
    this.errorHandler = config.errorHandler || null;

    this.enums = config.enums || {};
    this.models = config.models || {};
    this.collections = config.collections || {};

    // Build schemas
    this.schemas = ODataSettings.buildSchemas<EntitySchema<any>>(EntitySchema, config.schemas);

    // Set schema
    Object.entries(this.models)
      .forEach(([type, model]) => {
        (model as typeof Model).schema = this.schemas[type] as ModelSchema<any>;
      });

    // Configure
    Object.values(this.schemas)
      .forEach(schema => schema.configure(this));
  }

  public schemaForType<E>(type): Schema<Key, Field, E> {
    if (type in this.schemas)
      return this.schemas[type] as Schema<Key, Field, E>;
  }

  static buildSchemas<S extends Schema<Key, Field, any>>(Ctor: {new (keys: Key[], fields: Field[]): S},
    schemas: {[type: string]: {base?: string, keys?: Key[], fields?: Field[] }}
  ): {[type: string]: S } {
    let bases: {[type: string]: S } = Object.entries(schemas)
      .filter(([type, config]) => !('base' in config))
      .reduce((acc, [type, config]) => Object.assign(acc, {[type]: new Ctor(config.keys, config.fields)}), {});
    let descendants = Object.entries(schemas)
      .filter(([type, config]) => 'base' in config);
    while (descendants.length > 0) {
      let descendant = descendants.find(([type, config]) => config.base in bases);
      bases[descendant[0]] = bases[descendant[1].base].extend(descendant[1]) as S;
      descendants = descendants.filter(d => d !== descendant);
    }
    return bases;
  }
  
}