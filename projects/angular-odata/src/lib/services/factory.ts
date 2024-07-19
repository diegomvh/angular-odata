import { Injectable } from '@angular/core';
import { ODataClient } from '../client';
import { ODataEntitySetService } from './entity-set';
import { ODataSingletonService } from './singleton';
import { ODataCollection, ODataModel } from '../models';

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
    apiNameOrEntityType?: string,
    options: {
      Model?: { new (...params: any[]): ODataModel<T> };
      Collection?: {
        new (...params: any[]): ODataCollection<T, ODataModel<T>>;
      };
    } = {},
  ): ODataEntitySetService<T> {
    const Service = class extends ODataEntitySetService<T> {
      Model = options?.Model;
      Collection = options?.Collection;
    };
    return new Service(this.client, entitySetName, apiNameOrEntityType);
  }

  /** Factory method to create a singleton service.
   * @param singletonName Name of the singleton.
   * @param apiNameOrEntityType Name of the API or the type of the entity.
   */
  singleton<T>(
    singletonName: string,
    apiNameOrEntityType?: string,
    options: { Model?: { new (...params: any[]): ODataModel<T> } } = {},
  ): ODataSingletonService<T> {
    const Service = class extends ODataSingletonService<T> {
      Model = options?.Model;
    };
    return new Service(this.client, singletonName, apiNameOrEntityType);
  }
}
