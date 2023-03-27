import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfig } from './types';

export abstract class ODataConfigLoader {
  abstract loadConfigs(): Observable<ApiConfig[]>;
}

export class ODataConfigStaticLoader implements ODataConfigLoader {
  constructor(private readonly passedConfigs: ApiConfig | ApiConfig[]) {}

  loadConfigs(): Observable<ApiConfig[]> {
    if (Array.isArray(this.passedConfigs)) {
      return of(this.passedConfigs);
    }

    return of([this.passedConfigs]);
  }
}

export class ODataConfigHttpLoader implements ODataConfigLoader {
  constructor(
    private readonly configs$: Observable<ApiConfig> | Observable<ApiConfig>[] | Observable<ApiConfig[]>
  ) {}

  loadConfigs(): Observable<ApiConfig[]> {
    if (Array.isArray(this.configs$)) {
      return forkJoin(this.configs$);
    }

    const singleConfigOrArray = this.configs$ as Observable<unknown>;

    return singleConfigOrArray.pipe(
      map((value: unknown) => {
        if (Array.isArray(value)) {
          return value as ApiConfig[];
        }

        return [value] as ApiConfig[];
      })
    );
  }
}