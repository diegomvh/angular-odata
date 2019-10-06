import { HttpClientModule } from '@angular/common/http';
import { NgModule, ModuleWithProviders } from '@angular/core';

import { ODataConfig, ODATA_CONFIG } from './config';
import { ODataClient } from './client';

@NgModule({
  imports: [HttpClientModule],
  providers: [ODataClient]
})
export class ODataModule {
  public static forConfig(config: ODataConfig): ModuleWithProviders {
    return {
      ngModule: ODataModule,
      providers: [
        { provide: ODATA_CONFIG, useValue: config }
      ]
    };
  }
}
