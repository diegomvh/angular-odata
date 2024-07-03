import { Observable, forkJoin, map, of } from 'rxjs';
import { ApiConfig } from './types';
import { ODataMetadataParser } from './metadata';

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

export class ODataMetadataLoader implements ODataConfigLoader {
  constructor(private readonly sources$: Observable<string | string[]>, private readonly baseConfigs: ApiConfig | ApiConfig[]) { }

  loadConfigs(): Observable<ApiConfig[]> {
    const configs = (Array.isArray(this.baseConfigs)) ? this.baseConfigs : [this.baseConfigs];
    return this.sources$.pipe(
      map((source) => (Array.isArray(source) ? source : [source]).map((m, i) => new ODataMetadataParser(m).metadata().toConfig(configs[i]?? {})) 
    ));
  }
}