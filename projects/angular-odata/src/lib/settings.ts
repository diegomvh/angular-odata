import { Observable } from 'rxjs';
import { ODataApi } from './api';
import { ODataCollection, ODataModel } from './models';
import { ODataRequest } from './resources';
import {
  ODataCallable,
  ODataEntitySet,
  ODataEnumType,
  ODataStructuredType,
} from './schema';
import { ODataEntityService } from './services/entity';
import { ApiConfig, EdmType, Parser } from './types';

export class ODataSettings {
  apis: ODataApi[];
  constructor(configs: ApiConfig[]) {
    this.apis = configs.map((config) => new ODataApi(config));
    if (this.apis.length > 1) {
      if (this.apis.some((c) => c.name === undefined))
        throw new Error('Multiple APIs: Needs configuration names');
      if (this.apis.filter((c) => c.default).length > 1)
        throw new Error('Multiple APIs: Needs only one default api');
    }
    // If not default setup first config as default api
    if (this.apis.every((c) => !c.default)) this.apis[0].default = true;
  }

  configure(settings: {
    requester?: (request: ODataRequest<any>) => Observable<any>;
  }) {
    this.apis.forEach((api) => api.configure(settings));
  }

  public defaultApi() {
    return this.apis.find((c) => c.default) as ODataApi;
  }
  public findApiByName(name: string) {
    return this.apis.find((c) => c.name === name);
  }
  public apiByName(name: string) {
    const api = this.findApiByName(name);
    if (api === undefined) throw new Error(`No API for name: ${name}`);
    return api;
  }
  public findApiForTypes(types: string[]) {
    return this.apis.find((c) =>
      c.schemas.some((s) => types.some((type) => s.isNamespaceOf(type))),
    );
  }
  public findApiForType(type: string) {
    return this.findApiForTypes([type]);
  }
  public apiForType(type: string) {
    const api = this.findApiForType(type);
    if (api === undefined) throw new Error(`No API for type: ${type}`);
    return api;
  }

  //#region Configs shortcuts
  public enumTypeForType<T>(type: string) {
    let values = this.apis
      .map((api) => api.findEnumTypeForType<T>(type))
      .filter((e) => e);
    if (values.length === 0) throw Error(`No Enum for type ${type} was found`);
    if (values.length > 1)
      throw Error('Multiple APIs: More than one value was found');
    return values[0] as ODataEnumType<T>;
  }

  public structuredTypeForType<T>(type: string) {
    let values = this.apis
      .map((api) => api.findStructuredTypeForType<T>(type))
      .filter((e) => e);
    if (values.length === 0)
      throw Error(`No Structured for type ${type} was found`);
    if (values.length > 1)
      throw Error('Multiple APIs: More than one value was found');
    return values[0] as ODataStructuredType<T>;
  }

  public callableForType<T>(type: string, bindingType?: string) {
    let values = this.apis
      .map((api) => api.findCallableForType<T>(type, bindingType))
      .filter((e) => e);
    if (values.length === 0)
      throw Error(`No Callable for type ${type} was found`);
    if (values.length > 1)
      throw Error('Multiple APIs: More than one value was found');
    return values[0] as ODataCallable<T>;
  }

  public entitySetForType(type: string) {
    let values = this.apis
      .map((api) => api.findEntitySetForType(type))
      .filter((e) => e);
    if (values.length === 0)
      throw Error(`No EntitySet for type ${type} was found`);
    if (values.length > 1)
      throw Error('Multiple APIs: More than one value was found');
    return values[0] as ODataEntitySet;
  }

  public parserForType<T>(type: string | EdmType) {
    let values = this.apis
      .map((api) => api.parserForType<T>(type))
      .filter((e) => e);
    if (values.length === 0)
      throw Error(`No Parser for type ${type} was found`);
    if (!type.startsWith('Edm.') && values.length > 1)
      throw Error('Multiple APIs: More than one value was found');
    return values[0] as Parser<T>;
  }

  public modelForType(type: string) {
    let values = this.apis
      .map((api) => api.findModelForType(type))
      .filter((e) => e);
    if (values.length === 0) throw Error(`No Model for type ${type} was found`);
    if (values.length > 1)
      throw Error('Multiple APIs: More than one value was found');
    return values[0] as typeof ODataModel;
  }

  public collectionForType(type: string) {
    let values = this.apis
      .map((api) => api.findCollectionForType(type))
      .filter((e) => e);
    if (values.length === 0)
      throw Error(`No Collection for type ${type} was found`);
    if (values.length > 1)
      throw Error('Multiple APIs: More than one value was found');
    return values[0] as typeof ODataCollection;
  }

  public serviceForType(type: string) {
    let values = this.apis
      .map((api) => api.findServiceForType(type))
      .filter((e) => e);
    if (values.length === 0)
      throw Error(`No Service for type ${type} was found`);
    if (values.length > 1)
      throw Error('Multiple APIs: More than one value was found');
    return values[0] as typeof ODataEntityService;
  }
  public serviceForEntityType(type: string) {
    let values = this.apis
      .map((api) => api.findServiceForEntityType(type))
      .filter((e) => e);
    if (values.length === 0)
      throw Error(`No Service for type ${type} was found`);
    if (values.length > 1)
      throw Error('Multiple APIs: More than one value was found');
    return values[0] as typeof ODataEntityService;
  }
  //#endregion
}
