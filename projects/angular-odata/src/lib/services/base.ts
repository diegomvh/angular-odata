import { HttpCallableOptions, ODataActionResource, ODataFunctionResource, ODataResource } from '../resources';
import { ODataClient } from "../client";
import { Observable } from 'rxjs';

export abstract class ODataBaseService {
  constructor(protected client: ODataClient, protected name: string, protected apiNameOrEntityType?: string) { }

  // Api Config
  get api() {
    return this.client.apiFor(this.apiNameOrEntityType);
  }

  // Callable Call
  protected call<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R> | ODataActionResource<P, R>,
    responseType: 'property' | 'entity' | 'entities' | 'none',
    { expand, select, ...options }: HttpCallableOptions<R> = {}
  ): Observable<any> {
    if (expand !== undefined) resource.query.expand(expand);
    if (select !== undefined) resource.query.select(select);
    switch (responseType) {
      case 'property':
        return resource.callProperty(params, options);
      case 'entity':
        return resource.callEntity(params, options);
      case 'entities':
        return resource.callEntities(params, options);
      default:
        return resource.call(params, options);
    }
  }
}
