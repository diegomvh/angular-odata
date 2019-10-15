import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { PlainObject, ODataRequest } from './odata-request';
import { Model, ModelCollection, EntitySchema } from './odata-model';
import { InjectionToken } from '@angular/core';

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
  schemas?: {[type: string]: EntitySchema<any> },
  models?: {[type: string]: { new(attrs: PlainObject, query: ODataRequest): Model }},
  collections?:{[type: string]: { new(models: PlainObject[], query: ODataRequest): ModelCollection<Model> }},
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}

const DEFAULTS = <ODataConfig>{
  withCredentials: false,
  withCount: true,
  stringAsEnum: false,
  maxPageSize: 20
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
  schemas?: {[type: string]: EntitySchema<any> };
  models?: {[type: string]: { new(attrs: PlainObject, query: ODataRequest): Model }};
  collections?:{[type: string]: { new(models: PlainObject[], query: ODataRequest): ModelCollection<Model> }};
  errorHandler?: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: ODataConfig) {
    Object.assign(this, DEFAULTS, {
      enums: [],
      schemas: [],
      models: [],
      collections: []
    }, config);
    Object.values(this.models)
      .forEach(model => (model as typeof Model).schema.configure(this));
    Object.values(this.schemas)
      .forEach(schema => schema.configure(this));
  }
}