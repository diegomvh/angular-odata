import { Injectable } from '@angular/core';

import { ODataClient } from "../client";
import { ODataEntityService } from './entity';
import { ODataModel, ODataCollection } from '../models';
import { ODataModelService } from './model';

@Injectable()
export class ODataServiceFactory {
  constructor(protected client: ODataClient) { }

  createEntityService<T>(path: string, type?: string): ODataEntityService<T> {
    return new class extends ODataEntityService<T> {
      static path = path;
      static entityType = type;
    }(this.client);
  }

  createModelService<T, M extends ODataModel<T>, C extends ODataCollection<T, M>>(path: string, type?: string): ODataModelService<T, M, C> {
    return new class extends ODataModelService<T, M, C> {
      static path = path;
      static entityType = type;
    }(this.client);
  }
}
