import { ApiConfig, EDM_PARSERS, ODataMetadata } from 'angular-odata';
import * as json from './metadata.json';

export const <%= classify(name) %> = {
  serviceRootUrl: '<%= serviceRootUrl %>', 
  metadataUrl: '<%= metadataUrl %>', 
  metadata: ODataMetadata.fromJson(json),
  name: '<%= apiConfigName %>',
  version: '<%= version %>',
  creation: new Date('<%= creation.toISOString() %>'),
  parsers: EDM_PARSERS
} as ApiConfig;