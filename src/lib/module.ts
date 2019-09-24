import { NgModule, ModuleWithProviders } from '@angular/core';

import { ODataContext } from './context';
import { ODataService } from './odata-service';
import { ODataConfig } from './config';

@NgModule({
  providers: [ODataService]
})
export class ODataModule {
  public static forContext(config: ODataConfig): ModuleWithProviders {
    return {
      ngModule: ODataModule,
      providers: [
        ODataService,
        { provide: ODataContext, useValue: new ODataContext(config) }
      ]
    };
  }
}
