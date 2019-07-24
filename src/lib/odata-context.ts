import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { ODataQueryType } from './odata-query/odata-query-type';
import { ODataModel } from './odata-model/odata-model';
import { ODataCollection } from './odata-model/odata-collection';

export class ODataContext {
  baseUrl: string;
  metadataUrl: string;
  withCredentials: boolean;
  creation: Date;
  version: string;
  metadata: Promise<any>;
  enums?: {[type: string]: any };
  models: {[type: string]: new (...params: any) => ODataModel };
  collections: {[type: string]: new (...params: any) => ODataCollection<ODataModel> };
  errorHandler: (error: HttpErrorResponse) => Observable<never>;

  constructor(options: {
    baseUrl?: string,
    metadataUrl?: string,
    withCredentials?: boolean,
    creation?: Date,
    version?: string,
    enums?: {[type: string]: any }
    models?: {[type: string]: new (...params: any) => ODataModel }
    collections?: {[type: string]: new (...params: any) => ODataCollection<ODataModel> }
    errorHandler?: (error: HttpErrorResponse) => Observable<never>
  }) {
    Object.assign(this, options);
    if (!options.metadataUrl && options.baseUrl)
      this.metadataUrl = `${options.baseUrl}$metadata`;
    else if (options.metadataUrl && !options.baseUrl)
      this.baseUrl = options.metadataUrl.substr(0, options.metadataUrl.indexOf("$metadata"));
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

  getEnum(name: string): new (...params: any) => ODataModel {
    return name in this.enums ? this.enums[name] : null;
  }

  getModel(name: string): new (...params: any) => ODataModel {
    return name in this.models ? this.models[name] : null;
  }

  getCollection(name: string): new (...params: any) => ODataCollection<ODataModel> {
    return name in this.collections ? this.collections[name] : null;
  }

  parse(value: any, type: string, ...params: any) {
    switch(type) {
      case 'String': return typeof (value) === "string"? value : value.toString();
      case 'Number': return typeof (value) === "number"? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean"? value : !!value;
      case 'Date': return value instanceof Date ? value : new Date(value);
      default: {
        // TODO: Enum? 
        var Enum = this.getEnum(type);
        if (Enum) return value;
        // Model? 
        var Model = this.getModel(type);
        if (Model) return new Model(value, this, ...params);
        // Collection?
        var Collection = this.getCollection(type);
        if (Collection) return new Collection(value, this, ...params);
      }
    }
    return value;
  }

  toJSON(value: any, type: string) {
    switch(type) {
      case 'String': return typeof (value) === "string"? value : value.toString();
      case 'Number': return typeof (value) === "number"? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean"? value : !!value;
      case 'Date': return value instanceof Date ? value.toISOString() : value;
      default: {
        // TODO: Enum? 
        var Enum = this.getEnum(type);
        if (Enum) return value;
        // Model? 
        var Model = this.getModel(type);
        if (Model) return value.toJSON(); 
        // Collection?
        var Collection = this.getCollection(type);
        if (Collection) return value.toJSON() 
      }
    }
    return value;
  }
}
