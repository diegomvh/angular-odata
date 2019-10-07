import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { InjectionToken } from '@angular/core';
import { PlainObject } from './odata-request';
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
  types?: {[type: string]: { new(attrs: PlainObject): ODataModel } | { new(models: PlainObject[]): ODataCollection<ODataModel>; }},
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}
