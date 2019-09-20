import { NgModule, ModuleWithProviders } from '@angular/core';

import { ODataContext, ODataConfig } from './odata-context';
import { ODataService } from './odata-service/odata.service';

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
