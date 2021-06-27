import {
  ODataActionResource,
  ODataFunctionResource,
  ODataNavigationPropertyResource,
  ODataEntity,
  ODataEntities,
  ODataProperty,
} from '../resources';
import {
  HttpActionOptions,
  HttpFunctionOptions,
  HttpNavigationPropertyOptions,
} from './options';
import { ODataClient } from '../client';
import { Observable } from 'rxjs';

export abstract class ODataBaseService {
  constructor(
    protected client: ODataClient,
    protected name: string,
    protected apiNameOrEntityType?: string
  ) {}

  // Api Config
  get api() {
    return this.client.apiFor(this.apiNameOrEntityType);
  }

  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'entity',
    options?: HttpFunctionOptions<R>
  ): Observable<ODataEntity<R>>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'entities',
    options?: HttpFunctionOptions<R>
  ): Observable<ODataEntities<R>>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'property',
    options?: HttpFunctionOptions<R>
  ): Observable<ODataProperty<R>>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'none',
    options?: HttpFunctionOptions<R>
  ): Observable<null>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'property' | 'entity' | 'entities' | 'none',
    options: HttpFunctionOptions<R> = {}
  ): Observable<any> {
    resource.query.apply(options);
    return resource.call(params, {
      responseType: responseType as any,
      ...options,
    });
  }

  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'entity',
    options?: HttpActionOptions<R>
  ): Observable<ODataEntity<R>>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'entities',
    options?: HttpActionOptions<R>
  ): Observable<ODataEntities<R>>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'property',
    options?: HttpActionOptions<R>
  ): Observable<ODataProperty<R>>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'none',
    options?: HttpActionOptions<R>
  ): Observable<null>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'property' | 'entity' | 'entities' | 'none',
    options: HttpActionOptions<R> = {}
  ): Observable<any> {
    resource.query.apply(options);
    return resource.call(params, {
      responseType: responseType as any,
      ...options,
    });
  }

  protected fetchNavigationProperty<S>(
    resource: ODataNavigationPropertyResource<S>,
    responseType: 'entity',
    options?: HttpNavigationPropertyOptions<S>
  ): Observable<ODataEntity<S>>;
  protected fetchNavigationProperty<S>(
    resource: ODataNavigationPropertyResource<S>,
    responseType: 'entities',
    options?: HttpNavigationPropertyOptions<S>
  ): Observable<ODataEntities<S>>;
  protected fetchNavigationProperty<S>(
    resource: ODataNavigationPropertyResource<S>,
    responseType: 'entity' | 'entities',
    options: HttpNavigationPropertyOptions<S> = {}
  ): Observable<any> {
    resource.query.apply(options);
    return resource.fetch({ responseType: responseType as any, ...options });
  }
}
