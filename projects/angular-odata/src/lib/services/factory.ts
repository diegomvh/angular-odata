import { Injectable } from '@angular/core';
import { ODataClient } from "../client";
import { ODataEntitySetService } from './entity-set';
import { ODataSingletonService } from './singleton';

@Injectable()
export class ODataServiceFactory {
  constructor(protected client: ODataClient) { }

  entitySet<T>(name: string, entityType?: string): ODataEntitySetService<T> {
    return new class extends ODataEntitySetService<T> {
    }(this.client, name, entityType);
  }

  singleton<T>(name: string, entityType?: string): ODataSingletonService<T> {
    return new class extends ODataSingletonService<T> {
    }(this.client, name, entityType);
  }
}
