import { ODataApiConfig, EDM_PARSERS, ODataMetadata, ODataVersion } from 'angular-odata';
import * as json from './metadata.json';<% for (let imp of imports) { %>
import { <%= imp.resolve().join(", ") %> } from '<%= imp.path() %>';<% } %>

export const <%= classify(name) %> = ODataMetadata.fromJson(json).toConfig({
  serviceRootUrl: '<%= serviceRootUrl %>',
  metadataUrl: '<%= metadataUrl %>',
  name: '<%= apiConfigName %>',
  version: '<%= version %>' as ODataVersion,
  creation: new Date('<%= creation.toISOString() %>'),
  parsers: EDM_PARSERS,
  models: {<% for(const model of models) { %>
    '<%= model.entityType() %>': <%= model.importedName(imports) %>, <% } %>
  },
  collections: {<% for(const col of collections) { %>
    '<%= col.entityType() %>': <%= col.importedName(imports) %>, <% } %>
  }
}) as ODataApiConfig;
