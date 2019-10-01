import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";

import { ODataConfig } from './config';
import { Model, Collection } from './odata-model';

export class ODataContext implements ODataConfig {
  baseUrl: string;
  metadataUrl?: string;
  withCredentials?: boolean;
  batch?: boolean;
  creation?: Date;
  version?: string;
  withCount?: boolean;
  models?: (typeof Model)[];
  collections?: (typeof Collection)[];
  errorHandler: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: ODataConfig) {
    Object.assign(this, config);
    if (!this.metadataUrl)
      this.metadataUrl = `${this.baseUrl}$metadata`;
  }

  serviceRoot(): string {
    let base = this.baseUrl;
    if (!base.endsWith('/')) {
      base += '/';
    }
    return base;
  }

  getModel(name: string) {
    let Ctor = (this.models || []).find(t => t.type === name);
    if (Ctor) return Ctor;
  }

  getCollection(name: string) {
    let Ctor = (this.collections || []).find(t => t.type === name);
    if (Ctor) return Ctor;
  }

}
