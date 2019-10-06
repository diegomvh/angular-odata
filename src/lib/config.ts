import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { InjectionToken } from '@angular/core';

export const ODATA_CONFIG = new InjectionToken<ODataConfig>('odata.config');

export interface ODataConfig {
  baseUrl: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  withCount?: boolean,
  batch?: boolean,
  creation?: Date,
  version?: string,
  types?: {[type: string]: { new(...args: any[]): any; } | { [k: number]: string }},
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}
