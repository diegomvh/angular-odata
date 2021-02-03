import { Injectable } from '@angular/core';
import { ODataClient } from "../client";
import { ODataEntitySetService } from './entity-set';
import { ODataSingletonService } from './singleton';

@Injectable()
export class ODataServiceFactory {
  constructor(protected client: ODataClient) { }

  entitySet<T>(path: string, apiNameOrEntityType?: string): ODataEntitySetService<T> {
    return new class extends ODataEntitySetService<T> {
    }(this.client, path, apiNameOrEntityType);
  }

  singleton<T>(path: string, apiNameOrEntityType?: string): ODataSingletonService<T> {
    return new class extends ODataSingletonService<T> {
    }(this.client, path, apiNameOrEntityType);
  }
}
