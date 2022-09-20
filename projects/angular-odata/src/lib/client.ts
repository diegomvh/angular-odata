import {
  HttpClient,
  HttpEvent,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataApi } from './api';
import { ODataCollection, ODataModel } from './models/index';
import {
  ODataActionResource,
  ODataBatchResource,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataFunctionResource,
  ODataMetadataResource,
  ODataNavigationPropertyResource,
  ODataRequest,
  ODataResource,
  ODataResponse,
  ODataSegment,
  ODataSingletonResource,
} from './resources/index';
import { ODataEntityService } from './services/entity';
import { ODataSettings } from './settings';

function addBody<T>(
  options: {
    etag?: string;
    apiName?: string;
    fetchPolicy?:
      | 'cache-first'
      | 'cache-and-network'
      | 'network-only'
      | 'no-cache'
      | 'cache-only';
    headers?: HttpHeaders | { [header: string]: string | string[] };
    observe?: 'body' | 'events' | 'response';
    params?: HttpParams | { [param: string]: string | string[] };
    reportProgress?: boolean;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    withCredentials?: boolean;
  },
  body: T | null
): any {
  return {
    body,
    etag: options.etag,
    apiName: options.apiName,
    fetchPolicy: options.fetchPolicy,
    headers: options.headers,
    observe: options.observe,
    params: options.params,
    reportProgress: options.reportProgress,
    responseType: options.responseType,
    withCredentials: options.withCredentials,
  };
}

@Injectable({
  providedIn: 'root',
})
export class ODataClient {
  constructor(
    private http: HttpClient,
    private settings: ODataSettings,
    private injector: Injector
  ) {
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
      api = this.settings.findApiForTypes(value.types());
    else if (typeof value === 'string')
      api =
        this.settings.findApiByName(value) ||
        this.settings.findApiForType(value);
    return api || this.settings.defaultApi();
  }

  /**
   * Resolve the parser for the given string type.
   * @param type The string type of the parser.
   * @returns The parser for the given type.
   */
  parserForType<T>(type: string) {
    return this.settings.parserForType<T>(type);
  }

  /**
   * Resolve the enum type for the given string type.
   * @param type The string type of the enum type.
   * @returns The enum type for the given type.
   */
  enumTypeForType<T>(type: string) {
    return this.settings.enumTypeForType<T>(type);
  }

  /**
   * Resolve the structured type for the given string type.
   * @param type The string type of the structured type.
   * @returns The structured type for the given type.
   */
  structuredTypeForType<T>(type: string) {
    return this.settings.structuredTypeForType<T>(type);
  }

  /**
   * Resolve the callable for the given string type.
   * @param type The string type of the callable.
   * @returns The callable for the given type.
   */
  callableForType<T>(type: string) {
    return this.settings.callableForType<T>(type);
  }

  /**
   * Resolve the entity set for the given string type.
   * @param type The string type of the entity set.
   * @returns The entity set for the given type.
   */
  entitySetForType(type: string) {
    return this.settings.entitySetForType(type);
  }

  /**
   * Resolve the model for the given string type.
   * @param type The string type of the model.
   * @returns The model for the given type.
   */
  modelForType(type: string): typeof ODataModel {
    return this.settings.modelForType(type);
  }

  /**
   * Resolve the collection for the given string type.
   * @param type The string type of the collection.
   * @returns The collection for the given type.
   */
  collectionForType(type: string): typeof ODataCollection {
    return this.settings.collectionForType(type);
  }

  /**
   * Resolve the service for the given string type.
   * @param type The string type of the service.
   * @returns The service for the given type.
   */
  serviceForType(type: string): ODataEntityService<any> {
    return this.injector.get(this.settings.serviceForType(type));
  }

  /**
   * Resolve the service for the given string entity type.
   * @param type The string entity type binding to the service.
   * @returns The service for the given entity type.
   */
  serviceForEntityType(type: string): ODataEntityService<any> {
    return this.injector.get(this.settings.serviceForEntityType(type));
  }

  enumTypeByName<T>(name: string) {
    return this.settings.enumTypeByName<T>(name);
  }
  structuredTypeByName<T>(name: string) {
    return this.settings.structuredTypeByName<T>(name);
  }
  callableByName<T>(name: string) {
    return this.settings.callableByName<T>(name);
  }
  entitySetByName(name: string) {
    return this.settings.entitySetByName(name);
  }
  modelByName(name: string): typeof ODataModel {
    return this.settings.modelByName(name);
  }
  collectionByName(name: string): typeof ODataCollection {
    return this.settings.collectionByName(name);
  }
  serviceByName(name: string): ODataEntityService<any> {
    return this.injector.get(this.settings.serviceByName(name));
  }
  //#endregion

  //#region API Resource Proxy Methods
  fromJSON<E>(
    json: { segments: ODataSegment[]; options: { [name: string]: any } },
    apiNameOrType?: string
  ):
    | ODataEntityResource<E>
    | ODataEntitySetResource<E>
    | ODataNavigationPropertyResource<E>
    | ODataSingletonResource<E>;
  fromJSON(
    json: { segments: ODataSegment[]; options: { [name: string]: any } },
    apiNameOrType?: string
  ) {
    return this.apiFor(apiNameOrType).fromJSON<any>(json);
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
    apiNameOrType?: string
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
    apiNameOrType?: string
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
    apiNameOrType?: string
  ): ODataFunctionResource<P, R> {
    return this.apiFor(apiNameOrType).function<P, R>(path);
  }
  //#endregion

  // Request headers, get, post, put, patch... etc
  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<ArrayBuffer>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<Blob>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<string>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      params?: HttpParams | { [param: string]: string | string[] };
      observe: 'events';
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Blob>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<string>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      reportProgress?: boolean;
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<any>>;

  request<R>(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      reportProgress?: boolean;
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<R>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<Blob>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<string>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      reportProgress?: boolean;
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<Object>>;

  request<R>(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      reportProgress?: boolean;
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<R>>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      responseType?: 'json';
      reportProgress?: boolean;
      withCredentials?: boolean;
    }
  ): Observable<Object>;

  request<R>(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      responseType?: 'json';
      reportProgress?: boolean;
      withCredentials?: boolean;
    }
  ): Observable<R>;

  request(
    method: string,
    resource: ODataResource<any>,
    options?: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      params?: HttpParams | { [param: string]: string | string[] };
      observe?: 'body' | 'events' | 'response';
      reportProgress?: boolean;
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
      withCredentials?: boolean;
    }
  ): Observable<any>;

  request(
    method: string,
    resource: ODataResource<any>,
    options: {
      body: any | null;
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body' | 'events' | 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
      withCredentials?: boolean;
    }
  ): Observable<any> {
    let api = options.apiName
      ? this.settings.apiByName(options.apiName)
      : resource.api;
    if (!api)
      throw new Error(
        `The types: '[${resource
          .types()
          .join(', ')}]' does not belongs to any known configuration`
      );

    const request = new ODataRequest({
      method,
      api,
      resource,
      body: options.body,
      observe: options.observe === 'events' ? 'events' : 'response',
      etag: options.etag,
      headers: options.headers,
      reportProgress: options.reportProgress,
      params: options.params,
      responseType: options.responseType,
      fetchPolicy: options.fetchPolicy,
      withCredentials: options.withCredentials,
    });

    return api
      .request(request)
      .pipe(
        map((res: any) =>
          options.observe === undefined || options.observe === 'body'
            ? res.body
            : res
        )
      );
  }

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<ArrayBuffer>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<Blob>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<string>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Blob>>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<string>>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Object>>;

  delete<T>(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<T>>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<Blob>>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<string>>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<Object>>;

  delete<T>(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<T>>;

  delete(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<Object>;

  delete<T>(
    resource: ODataResource<any>,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<T>;

  delete(
    resource: ODataResource<any>,
    options: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body' | 'events' | 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
      withCredentials?: boolean;
    } = {}
  ): Observable<any> {
    return this.request<any>('DELETE', resource, addBody<any>(options, null));
  }

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<ArrayBuffer>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<Blob>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<string>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Blob>>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<string>>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Object>>;

  get<T>(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<T>>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<Blob>>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<string>>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<Object>>;

  get<T>(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<T>>;

  get(
    resource: ODataResource<any>,
    options?: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<Object>;

  get<T>(
    resource: ODataResource<any>,
    options?: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<T>;

  get(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body' | 'events' | 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
      withCredentials?: boolean;
    } = {}
  ): Observable<any> {
    return this.request<any>('GET', resource, options as any);
  }

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<ArrayBuffer>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<Blob>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<string>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Blob>>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<string>>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Object>>;

  head<T>(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<T>>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<Blob>>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<string>>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<Object>>;

  head<T>(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<T>>;

  head(
    resource: ODataResource<any>,
    options?: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<Object>;

  head<T>(
    resource: ODataResource<any>,
    options?: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<T>;

  head(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body' | 'events' | 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
      withCredentials?: boolean;
    } = {}
  ): Observable<any> {
    return this.request<any>('HEAD', resource, options as any);
  }

  jsonp(
    resource: ODataResource<any>,
    callbackParam: string
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
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<ArrayBuffer>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<Blob>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<string>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Blob>>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<string>>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Object>>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Object>>;

  options<T>(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<T>>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<Blob>>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<string>>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<Object>>;

  options<T>(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<T>>;

  options(
    resource: ODataResource<any>,
    options?: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<Object>;

  options<T>(
    resource: ODataResource<any>,
    options?: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<T>;

  options(
    resource: ODataResource<any>,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body' | 'events' | 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
      withCredentials?: boolean;
    } = {}
  ): Observable<any> {
    return this.request<any>('OPTIONS', resource, options as any);
  }

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<ArrayBuffer>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<Blob>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<string>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Blob>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<string>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Object>>;

  patch<T>(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<T>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<Blob>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<string>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<Object>>;

  patch<T>(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<T>>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<Object>;

  patch<T>(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<T>;

  patch(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body' | 'events' | 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
      withCredentials?: boolean;
    } = {}
  ): Observable<any> {
    return this.request<any>('PATCH', resource, addBody(options, body));
  }

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<ArrayBuffer>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<Blob>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<string>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Blob>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<string>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Object>>;

  post<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<T>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<Blob>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<string>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<Object>>;

  post<T>(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<T>>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<Object>;

  post<T>(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<T>;

  post(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body' | 'events' | 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
      withCredentials?: boolean;
    } = {}
  ): Observable<any> {
    return this.request<any>('POST', resource, addBody(options, body));
  }

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<ArrayBuffer>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<Blob>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<string>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Blob>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<string>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<Object>>;

  put<T>(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'events';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<HttpEvent<T>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
    }
  ): Observable<HttpResponse<Blob>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<string>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<Object>>;

  put<T>(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe: 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<ODataResponse<T>>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<Object>;

  put<T>(
    resource: ODataResource<any>,
    body: any | null,
    options?: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    }
  ): Observable<T>;

  put(
    resource: ODataResource<any>,
    body: any | null,
    options: {
      etag?: string;
      apiName?: string;
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'no-cache'
        | 'cache-only';
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body' | 'events' | 'response';
      params?: HttpParams | { [param: string]: string | string[] };
      reportProgress?: boolean;
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
      withCredentials?: boolean;
    } = {}
  ): Observable<any> {
    return this.request<any>('PUT', resource, addBody(options, body));
  }
}
