import { CommonModule } from '@angular/common';
import {
  EnvironmentProviders,
  InjectionToken,
  ModuleWithProviders,
  NgModule,
  Provider,
  makeEnvironmentProviders,
} from '@angular/core';
import { ODataClient } from './client';
import { ODataConfigLoader, ODataConfigSyncLoader } from './loaders';
import { ODataServiceFactory } from './services/index';
import type { ODataApiConfig } from './types';

export interface PassedInitialConfig {
  config?: ODataApiConfig | ODataApiConfig[];
  loader?: Provider;
}

export const ODATA_CONFIG = new InjectionToken<ODataApiConfig>('odata.config');

export function createSyncLoader(passedConfig: PassedInitialConfig) {
  return new ODataConfigSyncLoader(passedConfig.config!);
}

// Standalone version
export function provideODataClient(passedConfig: PassedInitialConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ODATA_CONFIG, useValue: passedConfig },
    passedConfig?.loader ?? {
      provide: ODataConfigLoader,
      useFactory: createSyncLoader,
      deps: [ODATA_CONFIG],
    },
    ODataClient,
    ODataServiceFactory,
  ]);
}

// Module version
@NgModule({
  imports: [CommonModule],
  providers: [ODataClient, ODataServiceFactory],
})
export class ODataModule {
  static forRoot(passedConfig: PassedInitialConfig): ModuleWithProviders<ODataModule> {
    return {
      ngModule: ODataModule,
      providers: [
        // Make the ODATA_CONFIG available through injection
        { provide: ODATA_CONFIG, useValue: passedConfig },

        // Create the loader: Either the one getting passed or a sync one
        passedConfig?.loader ?? {
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
