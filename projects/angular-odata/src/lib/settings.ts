import { ApiConfig, Parser } from './types';
import { Types } from './utils';
import { ODataCollection } from './models/collection';
import { ODataModel } from './models/model';
import { ODataApi } from './api';
import { HttpClient } from '@angular/common/http';

export class ODataSettings {
  apis?: Array<ODataApi>;

  constructor(http: HttpClient, ...configs: ApiConfig[]) {
    this.apis = configs.map(config => new ODataApi(http, config));
    if (this.apis.length > 1) {
      if (this.apis.some(c => Types.isUndefined(c.name)))
        throw new Error("Multiple APIs: Needs configuration names");
      if (this.apis.filter(c => c.default).length > 1)
        throw new Error("Multiple APIs: Needs only one default api");
    }
    // If not default setup first config as default api
    if (this.apis.every(c => !c.default))
      this.apis[0].default = true;
    this.apis.forEach(api => api.configure());
  }

  public apiByNameOrDefault(name?: string) {
    if (this.apis.length > 1 && !Types.isUndefined(name)) {
      const api = this.apis.find(c => c.name === name);
      if (api) return api;
    }
    return this.apis.find(c => c.default);
  }

  public apiForTypesOrDefault(types: string[]) {
    if (this.apis.length > 1) {
      const api = this.apis.find(c => c.schemas.some(s => types.some(type => s.isNamespaceOf(type))));
      if (api) return api;
    }
    return this.apis.find(c => c.default);
  }

  public apiForType(type: string) {
    return this.apiForTypesOrDefault([type]);
  }

  //#region Configs shortcuts
  public enumTypeForType<T>(type: string) {
    let values = this.apis.map(api => api.enumTypeForType<T>(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public structuredTypeForType<T>(type: string) {
    let values = this.apis.map(api => api.structuredTypeForType<T>(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public callableFor<T>(type: string) {
    let values = this.apis.map(api => api.callableForType<T>(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public entitySetForType(type: string) {
    let values = this.apis.map(api => api.entitySetForType(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public parserForType<T>(type: string): Parser<T> {
    let values = this.apis.map(api => api.parserForType<T>(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0] as Parser<T>;
  }

  public modelForType(type: string): typeof ODataModel {
    let values = this.apis.map(api => api.modelForType(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public collectionForType(type: string): typeof ODataCollection {
    let values = this.apis.map(api => api.collectionForType(type)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public enumTypeByName<T>(name: string) {
    let values = this.apis.map(api => api.enumTypeByName<T>(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public structuredTypeByName<T>(name: string) {
    let values = this.apis.map(api => api.structuredTypeByName<T>(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public entitySetByName(name: string) {
    let values = this.apis.map(api => api.entitySetByName(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public modelByName(name: string): typeof ODataModel {
    let values = this.apis.map(api => api.modelByName(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }

  public collectionByName(name: string): typeof ODataCollection {
    let values = this.apis.map(api => api.collectionByName(name)).filter(e => e);
    if (values.length > 1)
      throw Error("Multiple APIs: More than one value was found");
    return values[0];
  }
  //#endregion
}
