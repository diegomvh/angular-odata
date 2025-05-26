import { ODataApiConfig, EDM_PARSERS, ODataMetadata, ODataVersion } from 'angular-odata';
import * as json from './metadata.json';

export const <%= classify(name) %> = ODataMetadata.fromJson(json).toConfig({
  serviceRootUrl: '<%= serviceRootUrl %>',
  metadataUrl: '<%= metadataUrl %>',
  name: '<%= apiConfigName %>',
  version: '<%= version %>' as ODataVersion,
  creation: new Date('<%= creation.toISOString() %>'),
  parsers: EDM_PARSERS
}) as ODataApiConfig;
