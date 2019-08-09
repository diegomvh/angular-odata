import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataQueryType } from './odata-query/odata-query-type';
import { Model } from './odata-model/odata-model';
import { Collection } from './odata-model/odata-collection';
import { ODataQueryBase } from './odata-query/odata-query-base';

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

  createEndpointUrl(query: ODataQueryType): string {
    let path = `${query}`;
    let base = `${this.baseUrl}`;
    if (path.startsWith('/'))
      path = path.slice(1);
    if (!base.endsWith('/')) {
      base += '/';
    }
    return `${base}${path}`;
  }

  assignOptions(...options) {
    return Object.assign({}, ...options, { withCredentials: this.withCredentials });
  }

  getType(name: string) {
    let Ctor = (this.types || []).find(t => t.type === name);
    if (Ctor) return Ctor;
  }

  createInstance(type: string, value: any, query: ODataQueryBase) {
    let Ctor = this.getType(type);
    let instance = new Ctor(value, query);
    instance.setContext(this);
    return instance;
  }
}
