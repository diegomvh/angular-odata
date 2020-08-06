import { Injectable } from '@angular/core';
import { ODataClient } from "../client";
import { ODataEntityService } from './entity';
import { ODataSingletonService } from './singleton';

@Injectable()
export class ODataServiceFactory {
  constructor(protected client: ODataClient) { }

  entity<T>(name: string, entityType?: string): ODataEntityService<T> {
    return new class extends ODataEntityService<T> {
    }(this.client, name, entityType);
  }

  singleton<T>(name: string, entityType?: string): ODataSingletonService<T> {
    return new class extends ODataSingletonService<T> {
    }(this.client, name, entityType);
  }
}
