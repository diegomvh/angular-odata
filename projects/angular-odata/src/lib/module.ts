import { CommonModule } from '@angular/common';
import {
  EnvironmentProviders,
  InjectionToken,
  ModuleWithProviders,
  NgModule,
  Provider,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { ODataLoader, ODataSyncLoader } from './loaders';
import { ODataServiceFactory } from './services/index';
import type { ODataApiConfig } from './types';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { ODataRequest } from './resources';
import { Observable } from 'rxjs';
import { ODataClient } from './client';

export interface PassedInitialConfig {
  config?: ODataApiConfig | ODataApiConfig[];
  loader?: Provider;
}

export const ODATA_CONFIG = new InjectionToken<ODataApiConfig | ODataApiConfig[]>('odata.config');

export function defaultHttpSyncLoader(config: ODataApiConfig | ODataApiConfig[], http: HttpClient) {
  return new ODataSyncLoader(config!,
    (req: ODataRequest<any>): Observable<any> =>
      http.request(req.method, `${req.url}`, {
        body: req.body,
        context: req.context,
        headers: req.headers,
        observe: req.observe,
        params: req.params,
        reportProgress: req.reportProgress,
        responseType: req.responseType,
        withCredentials: req.withCredentials,
      }),
    ); 
}

// Standalone version
export function provideODataClient(passedConfig: PassedInitialConfig): EnvironmentProviders {
  let providers: (Provider | EnvironmentProviders)[] = [
    // Make the ODATA_CONFIG available through injection
    { provide: ODATA_CONFIG, useValue: passedConfig.config ?? [] },
    // Register the startup task
    provideAppInitializer(() => inject(ODataClient).initialize()),
    ODataClient,
    ODataServiceFactory,
  ];
  if (passedConfig?.loader === undefined) {
    providers = [...providers,
    provideHttpClient(),
    {
      provide: ODataLoader,
      useFactory: defaultHttpSyncLoader,
      deps: [ODATA_CONFIG, HttpClient],
    }];
  } else {
    providers = [...providers, passedConfig.loader];
  }
  return makeEnvironmentProviders(providers);
}

// Module version
@NgModule({
  imports: [CommonModule],
})
export class ODataModule {
  static forRoot(passedConfig: PassedInitialConfig): ModuleWithProviders<ODataModule> {
    let providers: (Provider | EnvironmentProviders)[] = [
      // Make the ODATA_CONFIG available through injection
      { provide: ODATA_CONFIG, useValue: passedConfig.config ?? []},
      // Register the startup task
      provideAppInitializer(() => inject(ODataClient).initialize()),
      ODataClient,
      ODataServiceFactory,
    ];
    if (passedConfig?.loader === undefined) {
      providers = [...providers,
      provideHttpClient(),
      {
        provide: ODataLoader,
        useFactory: defaultHttpSyncLoader,
        deps: [ODATA_CONFIG, HttpClient],
      }];
    } else {
      providers = [...providers, passedConfig.loader];
    }
    return {
      ngModule: ODataModule,
      providers
    };
  }
}

