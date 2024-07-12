import { ApiConfig, EDM_PARSERS } from 'angular-odata';

export const <%= classify(name) %> = {
  serviceRootUrl: '<%= serviceRootUrl %>', 
  name: '<%= name %>',
  version: '<%= version %>',
  creation: new Date('<%= creation.toISOString() %>'),
  parsers: EDM_PARSERS
} as ApiConfig;
