import { InjectionToken } from '@angular/core';
import { Configuration } from './types';

export const ODATA_CONFIGURATIONS = new InjectionToken<Configuration>('odata.configuraions');