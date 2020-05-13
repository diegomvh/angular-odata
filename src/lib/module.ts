import { HttpClientModule } from '@angular/common/http';
import { NgModule, ModuleWithProviders } from '@angular/core';

import { ODataSettings } from './models/settings';
import { ODataClient } from './client';
import { ODataServiceFactory } from './services/factory';
import { Settings, ODATA_CONFIG } from './types';

export function createSettings(config: Settings) {
  return new ODataSettings(config);
}

@NgModule({
  imports: [HttpClientModule],
  providers: [ODataClient, ODataServiceFactory]
})
export class ODataModule {
  public static forRoot(config: Settings): ModuleWithProviders {
    return {
      ngModule: ODataModule,
      providers: [
        { provide: ODATA_CONFIG, useValue: config },
        { 
          provide: ODataSettings, 
          useFactory: createSettings,
          deps: [ODATA_CONFIG]
        },
        ODataClient,
        ODataServiceFactory
      ]
    };
  }
}
