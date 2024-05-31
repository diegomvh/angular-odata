import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { ODataApi } from './api';
import { ODataConfigLoader } from './loaders';
import { ODataCollection, ODataModel } from './models/index';
import {
  ODataActionResource,
  ODataBatchResource,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataFunctionResource,
  ODataMetadata,
  ODataMetadataResource,
  ODataNavigationPropertyResource,
  ODataOptions,
  ODataRequest,
  ODataResource,
  ODataResponse,
  ODataSegment,
  ODataSingletonResource,
} from './resources/index';
import { ODataEntityService } from './services/entity';
import { ODataSettings } from './settings';

function addBody<T>(
  options: ODataOptions & {
    observe?: 'body' | 'events' | 'response';
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
  },
  body: T | null,
): any {
  return {
    body,
    etag: options.etag,
    fetchPolicy: options.fetchPolicy,
    headers: options.headers,
    observe: options.observe,
    params: options.params,
    reportProgress: options.reportProgress,
    responseType: options.responseType,
    withCredentials: options.withCredentials,
  };
}

@Injectable()
export class ODataClient {
  settings?: ODataSettings;
  constructor(
    private http: HttpClient,
    private loader: ODataConfigLoader,
  ) {
    this.loader.loadConfigs().subscribe((configs) => {
        this.settings = new ODataSettings(configs);
        this.settings.configure({
          requester: (req: ODataRequest<any>): Observable<any> =>
            this.http.request(req.method, `${req.url}`, {
              body: req.body,
              context: req.context,
              headers: req.headers,
              observe: req.observe,
              params: req.params,
              reportProgress: req.reportProgress,
              responseType: req.responseType,
              withCredentials: req.withCredentials,
            }),
        });
      });
  }

  //#region Resolve Building Blocks
  /**
   * Resolve the api for the given value.
   * Where value is: string type or an string name or an instance of resource.
   * @param value The value to resolve.
   * @returns The api for the value.
   */
  apiFor(value?: ODataResource<any> | string): ODataApi {
    let api: ODataApi | undefined = undefined;
    if (value instanceof ODataResource)
      api = this.settings!.findApiForTypes(value.types());
    else if (typeof value === 'string')
      api =
        this.settings!.findApiByName(value) ||
        this.settings!.findApiForType(value);
    return api ?? this.settings!.defaultApi();
  }

  defaultApi() {
    return this.settings!.defaultApi();
  }

  /**
   * Resolve the parser for the given string type.
   * @param type The string type of the parser.
   * @returns The parser for the given type.
   */
  parserForType<T>(type: string) {
    return this.settings!.parserForType<T>(type);
  }

  /**
   * Resolve the enum type for the given string type.
   * @param type The string type of the enum type.
   * @returns The enum type for the given type.
   */
  enumTypeForType<T>(type: string) {
    return this.settings!.enumTypeForType<T>(type);
  }

  /**
   * Resolve the structured type for the given string type.
   * @param type The string type of the structured type.
   * @returns The structured type for the given type.
   */
  structuredTypeForType<T>(type: string) {
    return this.settings!.structuredTypeForType<T>(type);
  }

  /**
   * Resolve the callable for the given string type.
   * @param type The string type of the callable.
   * @returns The callable for the given type.
   */
  callableForType<T>(type: string) {
    return this.settings!.callableForType<T>(type);
  }

  /**
   * Resolve the entity set for the given string type.
   * @param type The string type of the entity set.
   * @returns The entity set for the given type.
   */
  entitySetForType(type: string) {
    return this.settings!.entitySetForType(type);
  }

  /**
   * Resolve the model for the given string type.
   * @param type The string type of the model.
   * @returns The model for the given type.
   */
  modelForType(type: string): typeof ODataModel {
    return this.settings!.modelForType(type);
  }

  /**
   * Resolve the collection for the given string type.
   * @param type The string type of the collection.
   * @returns The collection for the given type.
   */
  collectionForType(type: string): typeof ODataCollection {
    return this.settings!.collectionForType(type);
  }

  /**
   * Resolve the service for the given string type.
   * @param type The string type of the service.
   * @returns The service for the given type.
   */
  serviceForType(type: string): ODataEntityService<any> | undefined {
    //return this.injector.get(this.settings!.serviceForType(type));
    return undefined;
  }

  /**
   * Resolve the service for the given string entity type.
   * @param type The string entity type binding to the service.
   * @returns The service for the given entity type.
   */
  serviceForEntityType(type: string): ODataEntityService<any> | undefined {
    //return this.injector.get(this.settings!.serviceForEntityType(type));
    return undefined;
  }

  enumTypeByName<T>(name: string) {
    return this.settings!.enumTypeByName<T>(name);
  }
  structuredTypeByName<T>(name: string) {
    return this.settings!.structuredTypeByName<T>(name);
  }
  callableByName<T>(name: string) {
    return this.settings!.callableByName<T>(name);
  }
  entitySetByName(name: string) {
    return this.settings!.entitySetByName(name);
  }
  modelByName(name: string): typeof ODataModel {
    return this.settings!.modelByName(name);
  }
  collectionByName(name: string): typeof ODataCollection {
    return this.settings!.collectionByName(name);
  }
  serviceByName(name: string): ODataEntityService<any> | undefined {
    //return this.injector.get(this.settings!.serviceByName(name));
    return undefined;
  }
  //#endregion

  //#region API Resource Proxy Methods
  fromJson<E>(
    json: { segments: ODataSegment[]; options: { [name: string]: any } },
    apiNameOrType?: string,
  ):
    | ODataEntityResource<E>
    | ODataEntitySetResource<E>
    | ODataNavigationPropertyResource<E>
    | ODataSingletonResource<E>;
  fromJson(
    json: { segments: ODataSegment[]; options: { [name: string]: any } },
    apiNameOrType?: string,
  ) {
    return this.apiFor(apiNameOrType).fromJson<any>(json);
  }

  // Requests
  /**
   * Build a resource for the metadata.
   * @param apiName The name of the API.
   * @returns The metadata resource.
   */
  metadata(apiName?: string): ODataMetadataResource {
    return this.apiFor(apiName).metadata();
  }

  /**
   * Build a resource for the batch.
   * @param apiName The name of the API.
   * @returns The batch resource.
   */
  batch(apiName?: string): ODataBatchResource {
    return this.apiFor(apiName).batch();
  }

  /**
   * Build a resource for the singleton.
   * @param path The full path to the singleton.
   * @param apiNameOrType The name of the API or the type of the singleton.
   * @returns The singleton resource.
   */
  singleton<T>(path: string, apiNameOrType?: string) {
    return this.apiFor(apiNameOrType).singleton<T>(path);
  }

  /**
   * Build a resource for the entity set.
   * @param path The full path to the entity set.
   * @param apiNameOrType The name of the API or the type of the entity set.
   * @returns The entity set resource.
   */
  entitySet<T>(
    path: string,
    apiNameOrType?: string,
  ): ODataEntitySetResource<T> {
    return this.apiFor(apiNameOrType).entitySet<T>(path);
  }

  /**
   * Build a resource for unbound action.
   * @param path The full path to the action.
   * @param apiNameOrType The name of the API or the type of the entity.
   * @returns The unbound action resource.
   */
  action<P, R>(
    path: string,
    apiNameOrType?: string,
  ): ODataActionResource<P, R> {
    return this.apiFor(apiNameOrType).action<P, R>(path);
  }

  /**
   * Build a resource for unbound function.
   * @param path The full path to the function.
   * @param apiNameOrType The name of the API or the type of the callable.
   * @returns The unbound function resource.
   */
  function<P, R>(
    path: string,
    apiNameOrType?: string,
  ): ODataFunctionResource<P, R> {
    return this.apiFor(apiNameOrType).function<P, R>(path);
  }
  //#endregion

  // Request headers, get, post, put, patch... etc
  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe?: 'body';
      responseType: 'arraybuffer';
    },
  ): Observable<ArrayBuffer>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe?: 'body';
      responseType: 'blob';
    },
  ): Observable<Blob>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe?: 'body';
      responseType: 'text';
    },
  ): Observable<string>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'events';
      responseType: 'arraybuffer';
    },
  ): Observable<HttpEvent<ArrayBuffer>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'events';
      responseType: 'blob';
    },
  ): Observable<HttpEvent<Blob>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'events';
      responseType: 'text';
    },
  ): Observable<HttpEvent<string>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<any>>;

  request<R>(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<R>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'response';
      responseType: 'arraybuffer';
    },
  ): Observable<ODataResponse<ArrayBuffer>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'response';
      responseType: 'blob';
    },
  ): Observable<ODataResponse<Blob>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'response';
      responseType: 'text';
    },
  ): Observable<ODataResponse<string>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<Object>>;

  request<R>(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<R>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<Object>;

  request<R>(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<R>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: ODataOptions & {
      body: any | null;
      observe?: 'body' | 'events' | 'response';
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    },
  ): Observable<any> {
    let api = this.apiFor(resource);

    return api.request(method, resource, options);
  }

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'arraybuffer';
    },
  ): Observable<ArrayBuffer>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'blob';
    },
  ): Observable<Blob>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'text';
    },
  ): Observable<string>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'arraybuffer';
    },
  ): Observable<HttpEvent<ArrayBuffer>>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'blob';
    },
  ): Observable<HttpEvent<Blob>>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'text';
    },
  ): Observable<HttpEvent<string>>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<Object>>;

  delete<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<T>>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'arraybuffer';
    },
  ): Observable<ODataResponse<ArrayBuffer>>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'blob';
    },
  ): Observable<ODataResponse<Blob>>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'text';
    },
  ): Observable<ODataResponse<string>>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<Object>>;

  delete<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<T>>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<Object>;

  delete<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<T>;

  delete(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body' | 'events' | 'response';
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    } = {},
  ): Observable<any> {
    return this.request<any>('DELETE', resource, addBody<any>(options, null));
  }

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'arraybuffer';
    },
  ): Observable<ArrayBuffer>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'blob';
    },
  ): Observable<Blob>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'text';
    },
  ): Observable<string>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'arraybuffer';
    },
  ): Observable<HttpEvent<ArrayBuffer>>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'blob';
    },
  ): Observable<HttpEvent<Blob>>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'text';
    },
  ): Observable<HttpEvent<string>>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<Object>>;

  get<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<T>>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'arraybuffer';
    },
  ): Observable<ODataResponse<ArrayBuffer>>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'blob';
    },
  ): Observable<ODataResponse<Blob>>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'text';
    },
  ): Observable<ODataResponse<string>>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<Object>>;

  get<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<T>>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<Object>;

  get<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<T>;

  get(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body' | 'events' | 'response';
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    } = {},
  ): Observable<any> {
    return this.request<any>('GET', resource, options as any);
  }

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'arraybuffer';
    },
  ): Observable<ArrayBuffer>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'blob';
    },
  ): Observable<Blob>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'text';
    },
  ): Observable<string>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'arraybuffer';
    },
  ): Observable<HttpEvent<ArrayBuffer>>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'blob';
    },
  ): Observable<HttpEvent<Blob>>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'text';
    },
  ): Observable<HttpEvent<string>>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<Object>>;

  head<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<T>>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'arraybuffer';
    },
  ): Observable<ODataResponse<ArrayBuffer>>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'blob';
    },
  ): Observable<ODataResponse<Blob>>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'text';
    },
  ): Observable<ODataResponse<string>>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<Object>>;

  head<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<T>>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<Object>;

  head<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<T>;

  head(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body' | 'events' | 'response';
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    } = {},
  ): Observable<any> {
    return this.request<any>('HEAD', resource, options as any);
  }

  jsonp(
    resource: ODataResource<any>,
    callbackParam: string,
  ): Observable<Object>;

  jsonp<T>(resource: ODataResource<any>, callbackParam: string): Observable<T>;

  jsonp<T>(resource: ODataResource<any>, callbackParam: string): Observable<T> {
    return this.request<any>('JSONP', resource, {
      body: null,
      params: new HttpParams().append(callbackParam, 'JSONP_CALLBACK'),
      observe: 'body',
      responseType: 'json',
    });
  }

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'arraybuffer';
    },
  ): Observable<ArrayBuffer>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'blob';
    },
  ): Observable<Blob>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'text';
    },
  ): Observable<string>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'arraybuffer';
    },
  ): Observable<HttpEvent<ArrayBuffer>>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'blob';
    },
  ): Observable<HttpEvent<Blob>>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'text';
    },
  ): Observable<HttpEvent<string>>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<Object>>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<Object>>;

  options<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<T>>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'arraybuffer';
    },
  ): Observable<ODataResponse<ArrayBuffer>>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'blob';
    },
  ): Observable<ODataResponse<Blob>>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'text';
    },
  ): Observable<ODataResponse<string>>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<Object>>;

  options<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<T>>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<Object>;

  options<T>(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<T>;

  options(
    resource: ODataResource<any>,
    options: ODataOptions & {
      observe?: 'body' | 'events' | 'response';
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    } = {},
  ): Observable<any> {
    return this.request<any>('OPTIONS', resource, options as any);
  }

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'arraybuffer';
    },
  ): Observable<ArrayBuffer>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'blob';
    },
  ): Observable<Blob>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'text';
    },
  ): Observable<string>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'arraybuffer';
    },
  ): Observable<HttpEvent<ArrayBuffer>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'blob';
    },
  ): Observable<HttpEvent<Blob>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'text';
    },
  ): Observable<HttpEvent<string>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<Object>>;

  patch<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<T>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'arraybuffer';
    },
  ): Observable<ODataResponse<ArrayBuffer>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'blob';
    },
  ): Observable<ODataResponse<Blob>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'text';
    },
  ): Observable<ODataResponse<string>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<Object>>;

  patch<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<T>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<Object>;

  patch<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<T>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body' | 'events' | 'response';
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    } = {},
  ): Observable<any> {
    return this.request<any>('PATCH', resource, addBody(options, body));
  }

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'arraybuffer';
    },
  ): Observable<ArrayBuffer>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'blob';
    },
  ): Observable<Blob>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'text';
    },
  ): Observable<string>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'arraybuffer';
    },
  ): Observable<HttpEvent<ArrayBuffer>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'blob';
    },
  ): Observable<HttpEvent<Blob>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'text';
    },
  ): Observable<HttpEvent<string>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<Object>>;

  post<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<T>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'arraybuffer';
    },
  ): Observable<ODataResponse<ArrayBuffer>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'blob';
    },
  ): Observable<ODataResponse<Blob>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'text';
    },
  ): Observable<ODataResponse<string>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<Object>>;

  post<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<T>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<Object>;

  post<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<T>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body' | 'events' | 'response';
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    } = {},
  ): Observable<any> {
    return this.request<any>('POST', resource, addBody(options, body));
  }

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'arraybuffer';
    },
  ): Observable<ArrayBuffer>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'blob';
    },
  ): Observable<Blob>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType: 'text';
    },
  ): Observable<string>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'arraybuffer';
    },
  ): Observable<HttpEvent<ArrayBuffer>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'blob';
    },
  ): Observable<HttpEvent<Blob>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType: 'text';
    },
  ): Observable<HttpEvent<string>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<Object>>;

  put<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'events';
      responseType?: 'json';
    },
  ): Observable<HttpEvent<T>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'arraybuffer';
    },
  ): Observable<ODataResponse<ArrayBuffer>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'blob';
    },
  ): Observable<ODataResponse<Blob>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType: 'text';
    },
  ): Observable<ODataResponse<string>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<Object>>;

  put<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe: 'response';
      responseType?: 'json';
    },
  ): Observable<ODataResponse<T>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<Object>;

  put<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body';
      responseType?: 'json';
    },
  ): Observable<T>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: ODataOptions & {
      observe?: 'body' | 'events' | 'response';
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    } = {},
  ): Observable<any> {
    return this.request<any>('PUT', resource, addBody(options, body));
  }
}
