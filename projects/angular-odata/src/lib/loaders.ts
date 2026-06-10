import { firstValueFrom, forkJoin, map, Observable } from 'rxjs';
import type { ODataApiConfig } from './types';
import { ODataMetadataParser } from './metadata';
import { ODataRequest } from './resources';

export abstract class ODataLoader {
  abstract load(): Promise<{ configs: ODataApiConfig[], requester: (req: ODataRequest<any>) => Observable<any> }>;
}

export class ODataSyncLoader implements ODataLoader {
  constructor(
    private readonly passedConfigs: ODataApiConfig | ODataApiConfig[],
    private readonly requester: (req: ODataRequest<any>) => Observable<any>) { }

  load() {
    const configs = Array.isArray(this.passedConfigs) ? this.passedConfigs : [this.passedConfigs];
    return Promise.resolve({ configs, requester: this.requester });
  }
}

export class ODataAsyncLoader implements ODataLoader {
  constructor(
    private readonly configs$:
      | Observable<ODataApiConfig>[]
      | Observable<ODataApiConfig | ODataApiConfig[]>,
    private readonly requester: (req: ODataRequest<any>) => Observable<any>) { }

  load() {
    return firstValueFrom(Array.isArray(this.configs$)
      ? forkJoin(this.configs$).pipe(map(configs => ({ configs, requester: this.requester })))
      : (this.configs$ as Observable<ODataApiConfig | ODataApiConfig[]>).pipe(
        map((value) => ({
          configs: Array.isArray(value) ? (value as ODataApiConfig[]) : ([value] as ODataApiConfig[]),
          requester: this.requester
        })
        ),
      ));
  }
}


export class ODataMetadataLoader implements ODataLoader {
  constructor(
    private readonly sources$: Observable<string | string[]>,
    private readonly baseConfigs: ODataApiConfig | ODataApiConfig[],
    private readonly requester: (req: ODataRequest<any>) => Observable<any>
  ) { }

  load() {
    const configs = Array.isArray(this.baseConfigs) ? this.baseConfigs : [this.baseConfigs];
    return firstValueFrom(this.sources$.pipe(
      map((source) => ({
        configs: (Array.isArray(source) ? source : [source]).map((m, i) =>
          new ODataMetadataParser(m).metadata().toConfig(configs[i] ?? {}),
        ),
        requester: this.requester
      })
      )),
    );
  }
}
