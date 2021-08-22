import { Injectable } from '@angular/core';
import { ODataClient } from '../client';
import { ODataEntitySetService } from './entity-set';
import { ODataSingletonService } from './singleton';

@Injectable()
export class ODataServiceFactory {
  constructor(protected client: ODataClient) {}

  /**
   * Factory method to create an entity set service.
   * @param entitySetName Name of the entity set.
   * @param apiNameOrEntityType Name of the API or the type of the entity.
   */
  entitySet<T>(
    entitySetName: string,
    apiNameOrEntityType?: string
  ): ODataEntitySetService<T> {
    return new (class extends ODataEntitySetService<T> {})(
      this.client,
      entitySetName,
      apiNameOrEntityType
    );
  }

  /** Factory method to create a singleton service.
   * @param singletonName Name of the singleton.
   * @param apiNameOrEntityType Name of the API or the type of the entity.
   */
  singleton<T>(
    singletonName: string,
    apiNameOrEntityType?: string
  ): ODataSingletonService<T> {
    return new (class extends ODataSingletonService<T> {})(
      this.client,
      singletonName,
      apiNameOrEntityType
    );
  }
}
