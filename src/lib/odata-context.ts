import { ODataQueryAbstract } from "./odata-query/odata-query-abstract";
import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";

export class ODataContext {
  baseUrl: string;
  metadataUrl: string;
  withCredentials: boolean;
  creation: Date;
  version: string;
  metadata: Promise<any>;
  errorHandler: (error: HttpErrorResponse) => Observable<never>;

  constructor(options: {
    baseUrl?: string,
    metadataUrl?: string,
    withCredentials?: boolean,
    creation?: Date,
    version?: string,
    errorHandler?: (error: HttpErrorResponse) => Observable<never>
  }) {
    Object.assign(this, options);
    if (!options.metadataUrl && options.baseUrl)
      this.metadataUrl = `${options.baseUrl}$metadata`;
    else if (options.metadataUrl && !options.baseUrl)
      this.baseUrl = options.metadataUrl.substr(0, options.metadataUrl.indexOf("$metadata"));
  }

  createEndpointUrl(query: ODataQueryAbstract): string {
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
}
