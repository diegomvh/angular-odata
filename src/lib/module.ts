import { HttpClientModule } from '@angular/common/http';
import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';

import { ODataConfig, ODataSettings, ODATA_CONFIG } from './settings';
import { ODataClient } from './client';

export function createSettings(config: ODataConfig) {
  return new ODataSettings(config);
}

@NgModule({
  imports: [HttpClientModule],
  providers: [ODataClient]
})
export class ODataModule {
  public static forRoot(config: ODataConfig): ModuleWithProviders {
    return {
      ngModule: ODataModule,
      providers: [
        { provide: ODATA_CONFIG, useValue: config },
        { 
          provide: ODataSettings, 
          useFactory: createSettings,
          deps: [ODATA_CONFIG]
        },
        ODataClient
      ]
    };
  }
}
