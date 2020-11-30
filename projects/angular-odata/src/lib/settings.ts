import { ApiConfig, Parser } from './types';
import { Types } from './utils';
import { ODataApi } from './api';
import { HttpClient } from '@angular/common/http';
import { ODataCallable, ODataEntitySet, ODataEnumType, ODataStructuredType } from './schema';
import { ODataRequest } from './resources';
import { Observable } from 'rxjs';

export class ODataSettings {
  apis: Array<ODataApi>;

  constructor(...configs: ApiConfig[]) {
    this.apis = configs.map(config => new ODataApi(config));
    if (this.apis.length > 1) {
      if (this.apis.some(c => Types.isUndefined(c.name)))
        throw new Error("Multiple APIs: Needs configuration names");
      if (this.apis.filter(c => c.default).length > 1)
        throw new Error("Multiple APIs: Needs only one default api");
    }
    // If not default setup first config as default api
    if (this.apis.every(c => !c.default))
      this.apis[0].default = true;
  }

  configure(settings: { requester: (request: ODataRequest<any>) => Observable<any> }) {
    this.apis.forEach(api => api.configure(settings));
  }

  public defaultApi() {
    return this.apis.find(c => c.default) as ODataApi;
  }

  public apiByName(name: string) {
    const api = this.apis.find(c => c.name === name);
    if (api === undefined)
      throw new Error(`No API for name: ${name}`);
    return api;
  }

  public findForTypes(types: string[]) {
    return this.apis.find(c => c.schemas.some(s => types.some(type => s.isNamespaceOf(type))));
  }

  public apiForType(type: string) {
    const api = this.apis.find(c => c.name === name);
    if (api === undefined)
      throw new Error(`No API for type: ${type}`);
    return api;
  }

  //#region Configs shortcuts
  public enumTypeForType<T>(type: string) {
    let values = this.apis.map(api => api.findEnumTypeForType(type)).filter(e => e);
    if (values.length === 0)
      throw Error(`No Enum for type ${type} was found`);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0] as ODataEnumType<T>;
  }

  public structuredTypeForType<T>(type: string) {
    let values = this.apis.map(api => api.findStructuredTypeForType(type)).filter(e => e);
    if (values.length === 0)
      throw Error(`No Structured for type ${type} was found`);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0] as ODataStructuredType<T>;
  }

  public callableFor<T>(type: string) {
    let values = this.apis.map(api => api.findCallableForType(type)).filter(e => e);
    if (values.length === 0)
      throw Error(`No Callable for type ${type} was found`);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0] as ODataCallable<T>;
  }

  public entitySetForType(type: string) {
    let values = this.apis.map(api => api.findEntitySetForType(type)).filter(e => e);
    if (values.length === 0)
      throw Error(`No EntitySet for type ${type} was found`);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0] as ODataEntitySet;
  }

  public parserForType<T>(type: string) {
    let values = this.apis.map(api => api.findParserForType<T>(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values.length === 1 ? values[0] as Parser<T> : null;
  }

  public modelForType(type: string) {
    let values = this.apis.map(api => api.findModelForType(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values.length === 1 ? values[0] : null;
  }

  public collectionForType(type: string) {
    let values = this.apis.map(api => api.findCollectionForType(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values.length === 1 ? values[0] : null;
  }

  public enumTypeByName<T>(name: string) {
    let values = this.apis.map(api => api.enumTypeByName<T>(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values.length === 1 ? values[0] : null;
  }

  public structuredTypeByName<T>(name: string) {
    let values = this.apis.map(api => api.structuredTypeByName<T>(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values.length === 1 ? values[0] : null;
  }

  public entitySetByName(name: string) {
    let values = this.apis.map(api => api.entitySetByName(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values.length === 1 ? values[0] : null;
  }

  public modelByName(name: string) {
    let values = this.apis.map(api => api.modelByName(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values.length === 1 ? values[0] : null;
  }

  public collectionByName(name: string) {
    let values = this.apis.map(api => api.collectionByName(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values.length === 1 ? values[0] : null;
  }
  //#endregion
}
