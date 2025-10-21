import type { Observable } from 'rxjs';
import type { ODataClient } from '../client';
import type {
  ODataActionOptions,
  ODataActionResource,
  ODataEntities,
  ODataEntity,
  ODataFunctionOptions,
  ODataFunctionResource,
  ODataNavigationPropertyResource,
  ODataProperty,
  ODataQueryArgumentsOptions,
} from '../resources';

export abstract class ODataBaseService {
  constructor(
    protected client: ODataClient,
    protected name: string,
    protected apiNameOrEntityType?: string,
  ) {}

  get api() {
    return this.client.apiFor(this.apiNameOrEntityType);
  }

  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'entity',
    options?: ODataFunctionOptions<R>,
  ): Observable<ODataEntity<R>>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'entities',
    options?: ODataFunctionOptions<R>,
  ): Observable<ODataEntities<R>>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'property',
    options?: ODataFunctionOptions<R>,
  ): Observable<ODataProperty<R>>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'none',
    options?: ODataFunctionOptions<R>,
  ): Observable<null>;
  protected callFunction<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R>,
    responseType: 'property' | 'entity' | 'entities' | 'none',
    options: ODataFunctionOptions<R> = {},
  ): Observable<any> {
    resource.query((q) => q.restore(options));
    return resource.call(params, {
      responseType: responseType as any,
      ...options,
    });
  }

  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'entity',
    options?: ODataActionOptions<R>,
  ): Observable<ODataEntity<R>>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'entities',
    options?: ODataActionOptions<R>,
  ): Observable<ODataEntities<R>>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'property',
    options?: ODataActionOptions<R>,
  ): Observable<ODataProperty<R>>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'none',
    options?: ODataActionOptions<R>,
  ): Observable<null>;
  protected callAction<P, R>(
    params: P | null,
    resource: ODataActionResource<P, R>,
    responseType: 'property' | 'entity' | 'entities' | 'none',
    options: ODataActionOptions<R> = {},
  ): Observable<any> {
    resource.query((q) => q.restore(options));
    return resource.call(params, {
      responseType: responseType as any,
      ...options,
    });
  }

  protected fetchNavigationProperty<S>(
    resource: ODataNavigationPropertyResource<S>,
    responseType: 'entity',
    options?: ODataQueryArgumentsOptions<S>,
  ): Observable<ODataEntity<S>>;
  protected fetchNavigationProperty<S>(
    resource: ODataNavigationPropertyResource<S>,
    responseType: 'entities',
    options?: ODataQueryArgumentsOptions<S>,
  ): Observable<ODataEntities<S>>;
  protected fetchNavigationProperty<S>(
    resource: ODataNavigationPropertyResource<S>,
    responseType: 'entity' | 'entities',
    options: ODataQueryArgumentsOptions<S> = {},
  ): Observable<any> {
    resource.query((q) => q.restore(options));
    return resource.fetch({ responseType: responseType as any, ...options });
  }
}
