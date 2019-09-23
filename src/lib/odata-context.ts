import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataUrl } from './odata-query/odata-query';

export interface ODataConfig {
  baseUrl?: string,
  metadataUrl?: string,
  withCredentials?: boolean,
  batchQueries: boolean;
  creation?: Date,
  version?: string,
  types?: any,
  errorHandler?: (error: HttpErrorResponse) => Observable<never>
}

export class ODataContext implements ODataConfig {
  baseUrl: string;
  metadataUrl: string;
  withCredentials: boolean;
  batchQueries: boolean;
  creation: Date;
  version: string;
  metadata: Promise<any>;
  types?: any;
  errorHandler: (error: HttpErrorResponse) => Observable<never>;

  constructor(config: ODataConfig) {
    Object.assign(this, config);
    if (!config.metadataUrl && config.baseUrl)
      this.metadataUrl = `${config.baseUrl}$metadata`;
    else if (config.metadataUrl && !config.baseUrl)
      this.baseUrl = config.metadataUrl.substr(0, config.metadataUrl.indexOf("$metadata"));
  }

  serviceRoot(): string {
    let base = this.baseUrl;
    if (!base.endsWith('/')) {
      base += '/';
    }
    return base;
  }

  getType(name: string) {
    let Ctor = (this.types || []).find(t => t.type === name);
    if (Ctor) return Ctor;
  }

  createInstance(type: string, value: any, query: ODataUrl) {
    let Ctor = this.getType(type);
    let instance = new Ctor(value, query);
    instance.setContext(this);
    return instance;
  }
}
