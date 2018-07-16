import { ODataService, ODataOptions } from './odata-service/odata.service';
import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export const ODataOptionsToken = new InjectionToken<ODataOptions>('odata.options');

export function _odataFactory(http: HttpClient, options: ODataOptions) {
  return new ODataService(http, options);
}

@NgModule({
  providers: [
    {
      provide: ODataService,
      useFactory: _odataFactory,
      deps: [HttpClient, ODataOptionsToken],
    }
  ]
})
export class ODataModule {
  public static forRoot(options: ODataOptions): ModuleWithProviders {
    return {
      ngModule: ODataModule,
      providers: [
        { provide: ODataOptionsToken, useValue: options }
      ]
    };
  }
}
