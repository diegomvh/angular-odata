import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";

export interface ODataConfig {
  baseUrl?: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  batch: boolean;
  creation?: Date,
  version?: string,
  types?: any,
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}
