import { Observable, of } from 'rxjs';
import { ApiConfig } from './types';

export abstract class ODataConfigLoader {
  abstract loadConfigs(): Observable<ApiConfig[]>;
}

export class ODataConfigDefaultLoader implements ODataConfigLoader {
  constructor(private readonly passedConfigs: ApiConfig | ApiConfig[]) {}

  loadConfigs(): Observable<ApiConfig[]> {
    if (Array.isArray(this.passedConfigs)) {
      return of(this.passedConfigs);
    }

    return of([this.passedConfigs]);
  }
}