import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { InjectionToken } from '@angular/core';
import { PlainObject, ODataRequest } from './odata-request';
import { ODataModel, ODataCollection } from './odata-model';

export const ODATA_CONFIG = new InjectionToken<ODataConfig>('odata.config');

export interface ODataConfig {
  baseUrl: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  withCount?: boolean,
  maxPageSize?: number,
  batch?: boolean,
  creation?: Date,
  version?: string,
  enums?: {[type: string]: {[key: number]: string | number}},
  models?: {[type: string]: { new(attrs: PlainObject, query: ODataRequest): ODataModel }},
  collections?:{[type: string]: { new(models: PlainObject[], query: ODataRequest): ODataCollection<ODataModel> }},
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}
