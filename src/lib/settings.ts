import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { PlainObject, ODataRequest } from './odata-request';
import { ODataModel, ODataCollection } from './odata-model';
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
  models?: {[type: string]: { new(attrs: PlainObject, query: ODataRequest): ODataModel }},
  collections?:{[type: string]: { new(models: PlainObject[], query: ODataRequest): ODataCollection<ODataModel> }},
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
  models?: {[type: string]: { new(attrs: PlainObject, query: ODataRequest): ODataModel }};
  collections?:{[type: string]: { new(models: PlainObject[], query: ODataRequest): ODataCollection<ODataModel> }};
  errorHandler?: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: ODataConfig) {
    Object.assign(this, config);
    Object.values(this.models || [])
      .forEach(model => (model as typeof ODataModel).schema.configure(this));
  }
}