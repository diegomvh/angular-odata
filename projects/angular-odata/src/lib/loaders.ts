import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfig } from './types';

export abstract class ODataConfigLoader {
  abstract loadConfigs(): Observable<ApiConfig[]>;
}

export class ODataConfigSyncLoader implements ODataConfigLoader {
  constructor(private readonly passedConfigs: ApiConfig | ApiConfig[]) {}

  loadConfigs(): Observable<ApiConfig[]> {
    if (Array.isArray(this.passedConfigs)) {
      return of(this.passedConfigs);
    }

    return of([this.passedConfigs]);
  }
}
