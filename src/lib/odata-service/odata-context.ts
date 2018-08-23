import { Injectable } from "@angular/core";
import { ODataQueryAbstract } from "../odata-query/odata-query-abstract";

@Injectable()
export class ODataContext {
  serviceRoot: string;
  withCredentials: boolean;
  
  createEndpointUrl(query: ODataQueryAbstract): string {
    return `${this.serviceRoot}${query}`;
  }

  assignOptions(...options) {
    return Object.assign({}, ...options, { withCredentials: this.withCredentials });
  }
}
