import { NgModule, ModuleWithProviders } from '@angular/core';
import { ODataContext } from './odata-context';

@NgModule({
})
export class ODataModule {
  public static forContext(options): ModuleWithProviders {
    return {
      ngModule: ODataModule,
      providers: [
        { provide: ODataContext, useValue: new ODataContext(options) }
      ]
    };
  }
}
