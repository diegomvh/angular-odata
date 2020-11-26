import { HttpClientModule } from '@angular/common/http';
import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';

import { ODataSettings } from './settings';
import { ODataClient } from './client';
import { ODataServiceFactory } from './services';
import { ApiConfig } from './types';
import { ODATA_CONFIGURATIONS } from './tokens';
import { ODataCache } from './cache';

export function createSettings(configs: ApiConfig[]) {
  return new ODataSettings(...configs);
}

@NgModule({
  imports: [HttpClientModule],
  providers: [ODataCache, ODataClient, ODataServiceFactory]
})
export class ODataModule {
  public static forRoot(...configs: ApiConfig[]): ModuleWithProviders<ODataModule> {
    return {
      ngModule: ODataModule,
      providers: [
        { provide: ODATA_CONFIGURATIONS, useValue: configs },
        {
          provide: ODataSettings,
          useFactory: createSettings,
          deps: [ODATA_CONFIGURATIONS]
        },
        ODataCache,
        ODataClient,
        ODataServiceFactory
      ]
    };
  }
}
