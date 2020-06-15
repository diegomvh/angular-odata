import { HttpClientModule } from '@angular/common/http';
import { NgModule, ModuleWithProviders } from '@angular/core';

import { ODataSettings } from './models/settings';
import { ODataClient } from './client';
import { ODataServiceFactory } from './services/factory';
import { Configuration, ODATA_CONFIGURATIONS } from './types';

export function createSettings(configs: Configuration[]) {
  return new ODataSettings(...configs);
}

@NgModule({
  imports: [HttpClientModule],
  providers: [ODataClient, ODataServiceFactory]
})
export class ODataModule {
  public static forRoot(...configs: Configuration[]): ModuleWithProviders {
    return {
      ngModule: ODataModule,
      providers: [
        { provide: ODATA_CONFIGURATIONS, useValue: configs },
        { 
          provide: ODataSettings, 
          useFactory: createSettings,
          deps: [ODATA_CONFIGURATIONS]
        },
        ODataClient,
        ODataServiceFactory
      ]
    };
  }
}
