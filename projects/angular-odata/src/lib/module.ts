import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import {
  InjectionToken,
  ModuleWithProviders,
  NgModule,
  Provider,
} from '@angular/core';
import { ODataClient } from './client';
import { ODataConfigLoader, ODataConfigSyncLoader } from './loaders';
import { ODataServiceFactory } from './services/index';
import { ApiConfig } from './types';

export interface PassedInitialConfig {
  config?: ApiConfig | ApiConfig[];
  loader?: Provider;
}

export const ODATA_CONFIG = new InjectionToken<ApiConfig>('odata.config');

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createSyncLoader(passedConfig: PassedInitialConfig) {
  return new ODataConfigSyncLoader(passedConfig.config!);
}

@NgModule({
  imports: [CommonModule, HttpClientModule],
  providers: [ODataClient, ODataServiceFactory],
})
export class ODataModule {
  static forRoot(
    passedConfig: PassedInitialConfig,
  ): ModuleWithProviders<ODataModule> {
    return {
      ngModule: ODataModule,
      providers: [
        // Make the ODATA_CONFIG available through injection
        { provide: ODATA_CONFIG, useValue: passedConfig },

        // Create the loader: Either the one getting passed or a sync one
        passedConfig?.loader || {
          provide: ODataConfigLoader,
          useFactory: createSyncLoader,
          deps: [ODATA_CONFIG],
        },
        ODataClient,
        ODataServiceFactory,
      ],
    };
  }
}
