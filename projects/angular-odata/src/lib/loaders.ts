import { Observable, forkJoin, map, of } from 'rxjs';
import { ODataApiConfig } from './types';
import { ODataMetadataParser } from './metadata';

export abstract class ODataConfigLoader {
  abstract loadConfigs(): Observable<ODataApiConfig[]>;
}

export class ODataConfigSyncLoader implements ODataConfigLoader {
  constructor(
    private readonly passedConfigs: ODataApiConfig | ODataApiConfig[],
  ) {}

  loadConfigs(): Observable<ODataApiConfig[]> {
    return Array.isArray(this.passedConfigs)
      ? of(this.passedConfigs)
      : of([this.passedConfigs]);
  }
}

export class ODataConfigAsyncLoader implements ODataConfigLoader {
  constructor(
    private readonly configs$:
      | Observable<ODataApiConfig>[]
      | Observable<ODataApiConfig | ODataApiConfig[]>,
  ) {}

  loadConfigs(): Observable<ODataApiConfig[]> {
    return Array.isArray(this.configs$)
      ? forkJoin(this.configs$)
      : (this.configs$ as Observable<ODataApiConfig | ODataApiConfig[]>).pipe(
          map((value) =>
            Array.isArray(value)
              ? (value as ODataApiConfig[])
              : ([value] as ODataApiConfig[]),
          ),
        );
  }
}

export class ODataMetadataLoader implements ODataConfigLoader {
  constructor(
    private readonly sources$: Observable<string | string[]>,
    private readonly baseConfigs: ODataApiConfig | ODataApiConfig[],
  ) {}

  loadConfigs(): Observable<ODataApiConfig[]> {
    const configs = Array.isArray(this.baseConfigs)
      ? this.baseConfigs
      : [this.baseConfigs];
    return this.sources$.pipe(
      map((source) =>
        (Array.isArray(source) ? source : [source]).map((m, i) =>
          new ODataMetadataParser(m).metadata().toConfig(configs[i] ?? {}),
        ),
      ),
    );
  }
}
