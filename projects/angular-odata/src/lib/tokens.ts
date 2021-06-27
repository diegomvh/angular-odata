import { ApiConfig } from './types';
import { InjectionToken } from '@angular/core';

export const ODATA_CONFIGURATIONS = new InjectionToken<ApiConfig>(
  'odata.configuraions'
);
