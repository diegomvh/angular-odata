import { NgModule, ModuleWithProviders } from '@angular/core';

import { ODataContext } from './context';
import { ODataConfig } from './config';
import { HttpClientModule } from '@angular/common/http';
import { ODataClient } from './client';

@NgModule({
  imports: [HttpClientModule],
  providers: [ODataClient]
})
export class ODataModule {
  public static forContext(config: ODataConfig): ModuleWithProviders {
    return {
      ngModule: ODataModule,
      providers: [
        ODataClient,
        { provide: ODataContext, useValue: new ODataContext(config) }
      ]
    };
  }
}
