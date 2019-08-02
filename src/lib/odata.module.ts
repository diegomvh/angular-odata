import { NgModule, ModuleWithProviders } from '@angular/core';
import { ODataContext, ODataConfig } from './odata-context';

@NgModule({
})
export class ODataModule {
  public static forContext(options: ODataConfig): ModuleWithProviders {
    return {
      ngModule: ODataModule,
      providers: [
        { provide: ODataContext, useValue: new ODataContext(options) }
      ]
    };
  }
}
