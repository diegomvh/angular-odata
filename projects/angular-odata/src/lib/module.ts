import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgModule, ModuleWithProviders } from '@angular/core';

import { ODataSettings } from './settings';
import { ODataClient } from './client';
import { ODataServiceFactory } from './services/index';
import { ApiConfig } from './types';
import { ODATA_CONFIGURATIONS } from './tokens';

export function createSettings(http: HttpClient, configs: ApiConfig[]) {
  return new ODataSettings(http, ...configs);
}

@NgModule({
  imports: [HttpClientModule],
  providers: [ODataClient, ODataServiceFactory]
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
          deps: [HttpClient, ODATA_CONFIGURATIONS]
        },
        ODataClient,
        ODataServiceFactory
      ]
    };
  }
}
