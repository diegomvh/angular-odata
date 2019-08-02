import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataQueryType } from './odata-query/odata-query-type';
import { Model } from './odata-model/odata-model';
import { Collection } from './odata-model/odata-collection';

export interface ODataConfig {
    baseUrl?: string,
    metadataUrl?: string,
    withCredentials?: boolean,
    creation?: Date,
    version?: string,
    enums?: {[type: string]: any }
    models?: {[type: string]: typeof Model }
    collections?: {[type: string]: typeof Collection }
    errorHandler?: (error: HttpErrorResponse) => Observable<never>
}

export class ODataContext implements ODataConfig {
  baseUrl: string;
  metadataUrl: string;
  withCredentials: boolean;
  creation: Date;
  version: string;
  metadata: Promise<any>;
  enums?: {[type: string]: any };
  models: {[type: string]: typeof Model };
  collections: {[type: string]: typeof Collection };
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

  getEnum(name: string) {
    return name in this.enums ? this.enums[name] : null;
  }

  getConstructor(name: string): typeof Collection | typeof Model {
    if (name in this.collections) {
      let Collection = this.collections[name];
      Collection.Model.schema.context = this;
      return Collection;
    } else if (name in this.models) {
      let Model = this.models[name];
      Model.schema.context = this;
      return Model;
    }
  }
}
