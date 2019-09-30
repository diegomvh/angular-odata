import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";

export interface ODataConfig {
  baseUrl?: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  withCount?: boolean;
  batch?: boolean;
  creation?: Date,
  version?: string,
  models?: any[];
  collections?: any[];
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}
