import { InjectionToken } from '@angular/core';
import { ApiConfig } from './types';

export const ODATA_CONFIGURATIONS = new InjectionToken<ApiConfig>('odata.configuraions');