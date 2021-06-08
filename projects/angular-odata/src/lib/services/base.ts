import { Expand, HttpActionOptions, HttpCallableOptions, HttpFunctionOptions, HttpOptions, ODataActionResource, ODataFunctionResource, ODataNavigationPropertyResource, Select } from '../resources';
import { ODataClient } from "../client";
import { Observable } from 'rxjs';

export abstract class ODataBaseService {
  constructor(protected client: ODataClient, protected name: string, protected apiNameOrEntityType?: string) { }

  // Api Config
  get api() {
    return this.client.apiFor(this.apiNameOrEntityType);
  }

  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'property' | 'entity' | 'entities' | 'none',
    options: HttpFunctionOptions<R> = {}): Observable<any> {
    switch (responseType) {
      case 'property':
        return resource.callProperty(params, options);
      case 'entity':
        return resource.callEntity(params, options);
      case 'entities':
        return resource.callEntities(params, options);
      default:
        return resource.call(params, {responseType, ...options});
    }
  }

  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'property' | 'entity' | 'entities' | 'none',
    options: HttpActionOptions<R> = {}): Observable<any> {
    switch (responseType) {
      case 'property':
        return resource.callProperty(params, options);
      case 'entity':
        return resource.callEntity(params, options);
      case 'entities':
        return resource.callEntities(params, options);
      default:
        return resource.call(params, {responseType, ...options});
    }
  }

  protected fetchNavigationProperty<S>(
    resource: ODataNavigationPropertyResource<S>,
    responseType: 'entity' | 'entities',
    options: HttpOptions = {}): Observable<any> {
    switch (responseType) {
      case 'entity':
        return resource.fetchModel(options);
      case 'entities':
        return resource.fetchCollection(options);
      default:
        return resource.fetch({responseType, ...options});
    }
  }
}
