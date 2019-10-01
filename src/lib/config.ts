import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { Model, Collection } from './odata-model';

export interface ODataConfig {
  baseUrl: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  withCount?: boolean;
  batch?: boolean;
  creation?: Date,
  version?: string,
  models?: (typeof Model)[];
  collections?: (typeof Collection)[];
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}
