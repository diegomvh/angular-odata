import { Observable, forkJoin, map, of } from 'rxjs';
import { ApiConfig } from './types';

export abstract class ODataConfigLoader {
  abstract loadConfigs(): Observable<ApiConfig[]>;
}

export class ODataConfigSyncLoader implements ODataConfigLoader {
  constructor(private readonly passedConfigs: ApiConfig | ApiConfig[]) { }

  loadConfigs(): Observable<ApiConfig[]> {
    return (Array.isArray(this.passedConfigs)) ? of(this.passedConfigs) : of([this.passedConfigs]);
  }
}

export class ODataConfigAsyncLoader implements ODataConfigLoader {
  constructor(private readonly configs$:
    Observable<ApiConfig>[] |
    Observable<ApiConfig | ApiConfig[]>) { }

  loadConfigs(): Observable<ApiConfig[]> {
    return (Array.isArray(this.configs$)) ?
      forkJoin(this.configs$) :
      (this.configs$ as Observable<ApiConfig | ApiConfig[]>)
        .pipe(
          map((value) => (Array.isArray(value)) ? value as ApiConfig[] : [value] as ApiConfig[])
        );
  }
}