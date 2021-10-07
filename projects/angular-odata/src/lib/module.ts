import { ModuleWithProviders, NgModule } from '@angular/core';

import { ApiConfig } from './types';
import { HttpClientModule } from '@angular/common/http';
import { ODATA_CONFIGURATIONS } from './tokens';
import { ODataClient } from './client';
import { ODataServiceFactory } from './services/index';
import { ODataSettings } from './settings';

export function createSettings(configs: ApiConfig[]) {
  return new ODataSettings(...configs);
}

@NgModule({
  imports: [HttpClientModule],
  providers: [ODataClient, ODataServiceFactory],
})
export class ODataModule {
  public static forRoot(
    ...configs: ApiConfig[]
  ): ModuleWithProviders<ODataModule> {
    return {
      ngModule: ODataModule,
      providers: [
        { provide: ODATA_CONFIGURATIONS, useValue: configs },
        {
          provide: ODataSettings,
          useFactory: createSettings,
          deps: [ODATA_CONFIGURATIONS],
        },
        ODataClient,
        ODataServiceFactory,
      ],
    };
  }
}
