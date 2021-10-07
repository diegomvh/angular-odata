import {
  ODataActionResource,
  ODataEntities,
  ODataEntity,
  ODataFunctionResource,
  ODataNavigationPropertyResource,
  ODataProperty,
  ODataQueryArgumentsOptions,
} from '../resources';

import { ODataClient } from '../client';
import { Observable } from 'rxjs';

export abstract class ODataBaseService {
  constructor(
    protected client: ODataClient,
    protected name: string,
    protected apiNameOrEntityType?: string
  ) {}

  get api() {
    return this.client.apiFor(this.apiNameOrEntityType);
  }

  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'entity',
    options?: ODataQueryArgumentsOptions<R>
  ): Observable<ODataEntity<R>>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'entities',
    options?: ODataQueryArgumentsOptions<R>
  ): Observable<ODataEntities<R>>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'property',
    options?: ODataQueryArgumentsOptions<R>
  ): Observable<ODataProperty<R>>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'none',
    options?: ODataQueryArgumentsOptions<R>
  ): Observable<null>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'property' | 'entity' | 'entities' | 'none',
    options: ODataQueryArgumentsOptions<R> = {}
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
    options?: ODataQueryArgumentsOptions<R>
  ): Observable<ODataEntity<R>>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'entities',
    options?: ODataQueryArgumentsOptions<R>
  ): Observable<ODataEntities<R>>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'property',
    options?: ODataQueryArgumentsOptions<R>
  ): Observable<ODataProperty<R>>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'none',
    options?: ODataQueryArgumentsOptions<R>
  ): Observable<null>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'property' | 'entity' | 'entities' | 'none',
    options: ODataQueryArgumentsOptions<R> = {}
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
    options?: ODataQueryArgumentsOptions<S>
  ): Observable<ODataEntity<S>>;
  protected fetchNavigationProperty<S>(
    resource: ODataNavigationPropertyResource<S>,
    responseType: 'entities',
    options?: ODataQueryArgumentsOptions<S>
  ): Observable<ODataEntities<S>>;
  protected fetchNavigationProperty<S>(
    resource: ODataNavigationPropertyResource<S>,
    responseType: 'entity' | 'entities',
    options: ODataQueryArgumentsOptions<S> = {}
  ): Observable<any> {
    resource.query.apply(options);
    return resource.fetch({ responseType: responseType as any, ...options });
  }
}
