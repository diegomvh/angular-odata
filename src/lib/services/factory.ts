import { Injectable } from '@angular/core';

import { ODataClient } from "../client";
import { ODataEntityService } from './entity';

@Injectable()
export class ODataServiceFactory {
  constructor(protected client: ODataClient) { }

  create<T>(path: string, type?: string): ODataEntityService<T> {
    return new class extends ODataEntityService<T> {
      static path = path;
      static type = type || "";
    }(this.client);
  }
}
